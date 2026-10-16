import os
from PIL import Image, ImageDraw

def create_mitra_icon(size=512, is_round=False):
    # Base image with transparent or green background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale factor
    scale = size / 24.0
    
    # Background: #183d2d
    bg_color = (24, 61, 45, 255) # #183d2d
    
    if is_round:
        draw.ellipse([0, 0, size - 1, size - 1], fill=bg_color)
    else:
        # Rounded rectangle with radius ~22%
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg_color)
    
    # Draw Bottle Cap: rect x=9, y=2, width=6, height=2.5, rx=1.25
    cap_x0 = 9 * scale
    cap_y0 = 2 * scale
    cap_x1 = 15 * scale
    cap_y1 = 4.5 * scale
    draw.rounded_rectangle([cap_x0, cap_y0, cap_x1, cap_y1], radius=int(1.25 * scale), fill=(255, 255, 255, 255))
    
    # Bottle Body outline & semi-transparent fill
    # Neck: (10, 4.5) to (14, 4.5) to (14, 7) to (16.5, 9.5) to (18, 13.04) to (18, 19) to (15, 22) to (9, 22) to (6, 19) to (6, 13.04) to (7.5, 9.5) to (10, 7)
    body_pts = [
        (10 * scale, 4.5 * scale),
        (14 * scale, 4.5 * scale),
        (14 * scale, 7.0 * scale),
        (16.5 * scale, 9.5 * scale),
        (18.0 * scale, 13.0 * scale),
        (18.0 * scale, 19.0 * scale),
        (15.0 * scale, 22.0 * scale),
        (9.0 * scale, 22.0 * scale),
        (6.0 * scale, 19.0 * scale),
        (6.0 * scale, 13.0 * scale),
        (7.5 * scale, 9.5 * scale),
        (10.0 * scale, 7.0 * scale),
    ]
    # Draw body semi-transparent fill
    draw.polygon(body_pts, fill=(255, 255, 255, 60))
    # Draw body stroke
    draw.line(body_pts + [body_pts[0]], fill=(255, 255, 255, 230), width=max(2, int(1.75 * scale)), joint='curve')
    
    # Milk level fill: bottom half of bottle
    milk_pts = [
        (6.5 * scale, 14.5 * scale),
        (9.5 * scale, 14.0 * scale),
        (12.5 * scale, 15.0 * scale),
        (15.5 * scale, 14.5 * scale),
        (17.5 * scale, 14.5 * scale),
        (17.5 * scale, 19.0 * scale),
        (15.0 * scale, 21.5 * scale),
        (9.0 * scale, 21.5 * scale),
        (6.5 * scale, 19.0 * scale),
    ]
    draw.polygon(milk_pts, fill=(255, 255, 255, 240))
    
    # Trust checkmark inside milk: (10, 17.5) -> (11.5, 19) -> (14.5, 16)
    chk_pts = [
        (10.0 * scale, 17.5 * scale),
        (11.5 * scale, 19.0 * scale),
        (14.5 * scale, 16.0 * scale)
    ]
    draw.line(chk_pts, fill=(24, 61, 45, 255), width=max(2, int(1.7 * scale)), joint='curve')
    
    return img

if __name__ == '__main__':
    out_dir = 'scripts/icons'
    os.makedirs(out_dir, exist_ok=True)
    icon_512 = create_mitra_icon(512, is_round=False)
    icon_512.save(os.path.join(out_dir, 'icon_512.png'))
    icon_512_round = create_mitra_icon(512, is_round=True)
    icon_512_round.save(os.path.join(out_dir, 'icon_512_round.png'))
    
    for s in [48, 72, 96, 144, 192]:
        resized = icon_512.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(out_dir, f'icon_{s}.png'))
    print('Generated all Mitra icons successfully in scripts/icons/')
