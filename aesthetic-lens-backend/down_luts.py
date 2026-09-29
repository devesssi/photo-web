import os
import math

def generate_cube_lut(filename, title, r_func, g_func, b_func, size=33):
    """
    Generates a valid 3D .cube file with custom transfer functions.
    size 33 is the standard industry size (33x33x33).
    """
    os.makedirs("luts", exist_ok=True)
    filepath = os.path.join("luts", filename)
    
    with open(filepath, "w") as f:
        f.write(f'TITLE "{title}"\n')
        f.write(f"LUT_3D_SIZE {size}\n")
        f.write("DOMAIN_MIN 0.0 0.0 0.0\n")
        f.write("DOMAIN_MAX 1.0 1.0 1.0\n\n")

        for b_idx in range(size):
            b_in = b_idx / (size - 1)
            for g_idx in range(size):
                g_in = g_idx / (size - 1)
                for r_idx in range(size):
                    r_in = r_idx / (size - 1)

                    # Calculate color shift
                    r_out = min(1.0, max(0.0, r_func(r_in, g_in, b_in)))
                    g_out = min(1.0, max(0.0, g_func(r_in, g_in, b_in)))
                    b_out = min(1.0, max(0.0, b_func(r_in, g_in, b_in)))

                    f.write(f"{r_out:.6f} {g_out:.6f} {b_out:.6f}\n")
                    
    print(f"✅ Generated: {filepath}")

def main():
    print("🎨 Generating 4 native aesthetic 3D LUTs...\n")

    # 1. Warm 35mm: Lifted shadows, warm skin tones, soft Kodak Portra response
    generate_cube_lut(
        "warm_35mm.cube", "Warm 35mm Film",
        r_func=lambda r, g, b: 0.04 + (r ** 0.92) * 0.96,
        g_func=lambda r, g, b: 0.03 + (g ** 0.96) * 0.95,
        b_func=lambda r, g, b: 0.02 + (b ** 1.08) * 0.90
    )

    # 2. Golden Hour: Amber warmth, deep warm midtones, soft highlights
    generate_cube_lut(
        "golden_hour.cube", "Golden Hour Glow",
        r_func=lambda r, g, b: 0.03 + (r ** 0.88) * 0.97,
        g_func=lambda r, g, b: 0.02 + (g ** 0.94) * 0.94,
        b_func=lambda r, g, b: 0.01 + (b ** 1.18) * 0.85
    )

    # 3. Moody Street: High contrast, cool shadows, muted greens
    generate_cube_lut(
        "moody_street.cube", "Moody Street Film",
        r_func=lambda r, g, b: (r ** 1.15) * 1.02,
        g_func=lambda r, g, b: (g ** 1.12) * 0.98,
        b_func=lambda r, g, b: 0.05 + (b ** 0.98) * 0.95
    )

    # 4. Clean Editorial: Neutral tones, soft contrast, film-like matte blacks
    generate_cube_lut(
        "clean_editorial.cube", "Clean Editorial",
        r_func=lambda r, g, b: 0.04 + (r ** 1.02) * 0.94,
        g_func=lambda r, g, b: 0.04 + (g ** 1.02) * 0.94,
        b_func=lambda r, g, b: 0.04 + (b ** 1.02) * 0.94
    )

    print("\n✨ All 4 .cube files are generated and ready in your /luts folder!")

if __name__ == "__main__":
    main()