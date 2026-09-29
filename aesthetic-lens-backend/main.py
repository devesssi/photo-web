import os
import io
import json
import traceback
import httpx
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageFilter
from google import genai
from google.genai import types

load_dotenv()

gemini_key = os.getenv("GEMINI_API_KEY")
unsplash_key = os.getenv("UNSPLASH_ACCESS_KEY", "")

if not gemini_key:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

# Pin API version to v1 so gemini-1.5-flash is resolved correctly
client = genai.Client(api_key=gemini_key)

app = FastAPI(title="Aesthetic Lens: Copilot & Darkroom Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# Schemas
# -------------------------------------------------------------------------

class ReferenceImage(BaseModel):
    id: str
    preview_url: str
    full_url: str
    alt_description: str | None
    photographer: str

class PoseBlueprint(BaseModel):
    head_and_gaze: str
    hands_and_arms: str
    torso_and_legs: str

class CopilotResponse(BaseModel):
    environment_detected: str
    camera_placement_tip: str
    pose_blueprint: PoseBlueprint
    lighting_fix: str
    recommended_lut: str
    matching_references: list[ReferenceImage]

# -------------------------------------------------------------------------
# SIDE A: PRE-CAPTURE (Environmental Posing Copilot)
# -------------------------------------------------------------------------

@app.post("/api/v1/copilot/suggest-pose", response_model=CopilotResponse)
async def suggest_pose(file: UploadFile = File(...)):
    """
    Analyzes setting via Gemini 1.5 Flash (1500 RPD free tier).
    Delivers exact camera placement, 3-part posing blueprints, and matching reference visuals.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Must be an image file.")

    raw_bytes = await file.read()
    try:
        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    # Downscale for rapid vision network transit
    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    thumb_buf = io.BytesIO()
    img.save(thumb_buf, format="JPEG", quality=85)

    prompt = """
    You are an elite portrait photographer and creative posing director.
    Analyze the uploaded setting (background architecture, surfaces, objects, and lighting).
    Your goal is to tell someone who does NOT know how to pose exactly what to do to look natural and aesthetic.

    Return ONLY a JSON object matching this structure:
    {
      "environment_detected": "Concise scene label (e.g., 'Modern Brushed Steel Elevator', 'Cozy Brick Cafe Booth', 'Minimal Indoor White Wall', 'Home Desk Setup')",
      "search_query": "A high-intent 2-to-4 word search query to find male streetwear/editorial candid portraits in this exact setting on Unsplash (e.g., 'elevator male portrait aesthetic', 'cafe male portrait 35mm', 'desk workspace candid man')",
      "camera_placement_tip": "Exact phone/camera instruction (e.g., 'Hold phone at sternum height, tilt top forward 5 degrees, step back 4 feet to avoid facial distortion')",
      "pose_blueprint": {
        "head_and_gaze": "Where to look (e.g., 'Tilt chin slightly down, glance toward the floor or phone screen—do not stare into the lens')",
        "hands_and_arms": "What to do with hands (e.g., 'Rest one elbow on the table, keep the other hand casually in pocket')",
        "torso_and_legs": "Body orientation (e.g., 'Angle shoulders 30 degrees off-center to create visual depth and a broader frame')"
      },
      "lighting_fix": "How to make the scene lighting flattering (e.g., 'Step 1 foot away from the overhead ceiling spot so your eyes aren't in dark shadow')",
      "recommended_lut": "Must be ONE of: ['moody_street', 'warm_35mm', 'clean_editorial', 'golden_hour']"
    }
    """

    try:
        ai_resp = client.models.generate_content(
            model="gemini-2.5-flash-lite",  # 1500 RPD free tier model
            contents=[
                types.Part.from_bytes(
                    data=thumb_buf.getvalue(),
                    mime_type="image/jpeg",
                ),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        plan = json.loads(ai_resp.text)
        print(f"✓ GEMINI SUCCESS: Detected '{plan.get('environment_detected')}'")
    except Exception as e:
        print("\n" + "="*50)
        print("[FALLBACK TRIGGERED] GEMINI API ERROR:", repr(e))
        traceback.print_exc()
        print("="*50 + "\n")
        
        plan = {
            "environment_detected": "Ambient Indoor Workspace",
            "search_query": "male streetwear portrait 35mm",
            "camera_placement_tip": "Hold phone level with your chest, step back 4 feet, and use 2x zoom to eliminate lens distortion.",
            "pose_blueprint": {
                "head_and_gaze": "Turn head 25 degrees away from the main light source, look naturally downward.",
                "hands_and_arms": "Keep one hand loosely on your laptop or desk surface, drop the other shoulder.",
                "torso_and_legs": "Angle your torso 30 degrees off-center from the camera lens."
            },
            "lighting_fix": "Turn toward the nearest window or diffuse direct top-down lighting.",
            "recommended_lut": "warm_35mm"
        }

    # Fetch reference visuals from Unsplash Search API
    search_query = plan.get("search_query", "male portrait editorial")
    references: list[ReferenceImage] = []
    
    if unsplash_key:
        async with httpx.AsyncClient() as http_client:
            try:
                resp = await http_client.get(
                    "https://api.unsplash.com/search/photos",
                    headers={"Authorization": f"Client-ID {unsplash_key}"},
                    params={
                        "query": search_query,
                        "orientation": "portrait",
                        "per_page": 4,
                    },
                    timeout=8.0,
                )
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    for item in results:
                        references.append(
                            ReferenceImage(
                                id=item.get("id", ""),
                                preview_url=item.get("urls", {}).get("small", ""),
                                full_url=item.get("urls", {}).get("regular", ""),
                                alt_description=item.get("alt_description"),
                                photographer=item.get("user", {}).get("name", "Photographer"),
                            )
                        )
            except Exception as e:
                print("Unsplash query warning:", repr(e))

    # High-quality fallback references if Unsplash is empty or unconfigured
    if not references:
        references = [
            ReferenceImage(
                id="ref1",
                preview_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
                full_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&auto=format&fit=crop&q=80",
                alt_description="Editorial candid leaning pose",
                photographer="Albert Dera"
            ),
            ReferenceImage(
                id="ref2",
                preview_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
                full_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80",
                alt_description="35mm moody portrait with natural gaze",
                photographer="Averi Davis"
            ),
            ReferenceImage(
                id="ref3",
                preview_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
                full_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80",
                alt_description="Minimal indoor natural lighting candid",
                photographer="Michael Dam"
            )
        ]

    return CopilotResponse(
        environment_detected=plan.get("environment_detected", "Indoors"),
        camera_placement_tip=plan.get("camera_placement_tip", "Hold phone at chest height."),
        pose_blueprint=PoseBlueprint(**plan.get("pose_blueprint", {
            "head_and_gaze": "Look 20 degrees away from the lens.",
            "hands_and_arms": "Keep hands relaxed and natural.",
            "torso_and_legs": "Angle shoulders diagonally."
        })),
        lighting_fix=plan.get("lighting_fix", "Avoid direct overhead downlights."),
        recommended_lut=plan.get("recommended_lut", "warm_35mm"),
        matching_references=references,
    )

# -------------------------------------------------------------------------
# SIDE B: POST-CAPTURE (Bold 35mm Analog Darkroom Engine)
# -------------------------------------------------------------------------

def apply_4_5_portrait_crop(img: Image.Image) -> Image.Image:
    """Clamps image to a strict vertical 4:5 portrait ratio, centering subject headroom."""
    w, h = img.size
    target_aspect = 0.8  # 4:5
    current_aspect = w / h

    if current_aspect > target_aspect:
        new_w = int(h * target_aspect)
        offset = (w - new_w) // 2
        return img.crop((offset, 0, offset + new_w, h))
    else:
        new_h = int(w / target_aspect)
        offset = max(0, (h - new_h) // 3)
        return img.crop((0, offset, w, min(h, offset + new_h)))

def apply_bold_35mm_grade(img_pil: Image.Image, lut_name: str = "warm_35mm") -> Image.Image:
    """
    1. Loads native 3D .cube LUT if present in /luts folder.
    2. Executes a cinematic S-curve lifting blacks to 0.12 (matte charcoal fade).
    3. Infuses Kodak Portra amber warmth into skin midtones.
    4. Injects high-density luma-masked 35mm film grain.
    """
    # 1. Apply native 3D .cube LUT if file exists
    lut_path = os.path.join("luts", f"{lut_name}.cube")
    if not os.path.exists(lut_path):
        lut_path = os.path.join("luts", "warm_35mm.cube")
        
    if os.path.exists(lut_path):
        try:
# Pillow uses .from_file() for .cube files
            lut = ImageFilter.Color3DLUT.from_file(lut_path)            
            img_pil = img_pil.filter(lut)
        except Exception as e:
            print(f"Note: Could not parse {lut_path}, proceeding with direct NumPy color science: {e}")

    # 2. Convert to normalized 0.0 - 1.0 float scale
    arr = np.array(img_pil).astype(np.float32) / 255.0

    # 3. High-Contrast Matte S-Curve (Lifts deep blacks to 0.12 matte floor)
    arr = 0.12 + 0.78 * (arr ** 1.35)

    # 4. Rich Kodak Portra Warmth (Warm Amber skin highlights, subtle cool teal shadow balance)
    r = np.clip(arr[:, :, 0] * 1.15 + 0.02, 0.0, 1.0)
    g = np.clip(arr[:, :, 1] * 1.02 + 0.01, 0.0, 1.0)
    b = np.clip(arr[:, :, 2] * 0.82 - 0.02, 0.0, 1.0)
    graded = np.stack([r, g, b], axis=-1)

    # 5. Visible 35mm Analog Midtone Grain (Intensity 0.065)
    luma = 0.299 * graded[:, :, 0] + 0.587 * graded[:, :, 1] + 0.114 * graded[:, :, 2]
    # Luma mask concentrates grain on skin, clothing, and midtones rather than blown whites
    mask = np.exp(-((luma - 0.50) ** 2) / (2 * (0.30 ** 2)))[:, :, None]
    
    noise = np.random.normal(0, 0.065, graded.shape)
    final_arr = np.clip(graded + (noise * mask), 0.0, 1.0)

    return Image.fromarray((final_arr * 255.0).astype(np.uint8))

@app.post("/api/v1/darkroom/enhance", response_class=Response)
async def enhance_image(file: UploadFile = File(...)):
    """
    Takes a raw photo and applies:
    - 4:5 vertical portrait crop
    - 3D LUT / Kodak Portra color grade
    - Matte black shadow lift
    - 35mm film grain
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Must be an image file.")

    raw_bytes = await file.read()
    try:
        img_pil = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    # 1. 4:5 Aspect Ratio Framing
    cropped_pil = apply_4_5_portrait_crop(img_pil)

    # 2. Bold 35mm Film Color Grade
    finished_pil = apply_bold_35mm_grade(cropped_pil, lut_name="warm_35mm")

    # 3. Export high-quality JPEG
    out_buf = io.BytesIO()
    finished_pil.save(out_buf, format="JPEG", quality=95)
    
    print(f"✓ DARKROOM FINISHED: Original {img_pil.size} -> Cropped {cropped_pil.size} with 35mm Portra Grade")
    return Response(content=out_buf.getvalue(), media_type="image/jpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)