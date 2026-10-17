import os
import subprocess
import shutil
from PIL import Image

edge_exe = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

def generate_svg_html(size, is_round, is_foreground_only=False):
    # If foreground only (for adaptive foreground), transparent background, no container rounding
    if is_foreground_only:
        # 108dp x 108dp adaptive foreground
        # Milk bottle centered in 108x108 safe zone
        # Viewbox 0 0 108 108
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: {size}px;
    height: {size}px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  svg {{
    width: {size}px;
    height: {size}px;
  }}
</style>
</head>
<body>
<svg viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(25.2, 25.2) scale(2.4)">
    <!-- Bottle Cap -->
    <rect x="9" y="2" width="6" height="2.5" rx="1.25" fill="#ffffff" />
    <!-- Bottle Outline & Translucent Body -->
    <path d="M10 4.5H14V7L16.5 9.5C17.44 10.44 18 11.71 18 13.04V19C18 20.66 16.66 22 15 22H9C7.34 22 6 20.66 6 19V13.04C6 11.71 6.56 10.44 7.5 9.5L10 7V4.5Z"
          fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round" />
    <!-- Milk Level Wave Fill -->
    <path d="M6.5 14.5C7.5 13.8 9.5 13.8 11 14.5C12.5 15.2 14.5 15.2 16 14.5C16.8 14.1 17.5 14.3 17.5 14.5V19C17.5 20.38 16.38 21.5 15 21.5H9C7.62 21.5 6.5 20.38 6.5 19V14.5Z"
          fill="#ffffff" fill-opacity="0.88" />
    <!-- Trust Checkmark Inside Milk -->
    <path d="M10 17.5L11.5 19L14.5 16" stroke="#183d2d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>
</body>
</html>"""

    # Full app icon (dark green background with rounded rect or circle)
    border_radius = "50%" if is_round else "22%"
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: {size}px;
    height: {size}px;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }}
  .icon-container {{
    width: {size}px;
    height: {size}px;
    background-color: #183d2d;
    border-radius: {border_radius};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }}
  svg {{
    width: {int(size * 0.65)}px;
    height: {int(size * 0.65)}px;
  }}
</style>
</head>
<body>
<div class="icon-container">
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Bottle Cap -->
    <rect x="9" y="2" width="6" height="2.5" rx="1.25" fill="#ffffff" />
    <!-- Bottle Neck & Outline -->
    <path d="M10 4.5H14V7L16.5 9.5C17.44 10.44 18 11.71 18 13.04V19C18 20.66 16.66 22 15 22H9C7.34 22 6 20.66 6 19V13.04C6 11.71 6.56 10.44 7.5 9.5L10 7V4.5Z"
          fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round" />
    <!-- Milk Level Wave -->
    <path d="M6.5 14.5C7.5 13.8 9.5 13.8 11 14.5C12.5 15.2 14.5 15.2 16 14.5C16.8 14.1 17.5 14.3 17.5 14.5V19C17.5 20.38 16.38 21.5 15 21.5H9C7.62 21.5 6.5 20.38 6.5 19V14.5Z"
          fill="#ffffff" fill-opacity="0.88" />
    <!-- Trust Checkmark -->
    <path d="M10 17.5L11.5 19L14.5 16" stroke="#183d2d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</div>
</body>
</html>"""

def render_html_to_png(html_content, out_png, render_size):
    temp_html = os.path.abspath('scripts/temp_render.html')
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    file_url = f'file:///{temp_html.replace(os.sep, "/")}'
    cmd = [
        edge_exe,
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--default-background-color=00000000',
        f'--window-size={render_size},{render_size}',
        f'--screenshot={os.path.abspath(out_png)}',
        file_url
    ]
    subprocess.check_call(cmd)
    if os.path.exists(temp_html):
        os.remove(temp_html)

def main():
    icons_dir = 'scripts/icons_rendered'
    os.makedirs(icons_dir, exist_ok=True)
    
    # Render Master 1024x1024 icons
    print('Rendering Master 1024x1024 icons with Edge headless...')
    master_square = os.path.join(icons_dir, 'master_square.png')
    master_round = os.path.join(icons_dir, 'master_round.png')
    master_fg = os.path.join(icons_dir, 'master_fg.png')
    
    render_html_to_png(generate_svg_html(1024, is_round=False), master_square, 1024)
    render_html_to_png(generate_svg_html(1024, is_round=True), master_round, 1024)
    render_html_to_png(generate_svg_html(1024, is_round=False, is_foreground_only=True), master_fg, 1024)
    
    print('Generated master rendered icons. Now downsampling to all Android densities...')
    # Load masters with PIL
    img_square = Image.open(master_square)
    img_round = Image.open(master_round)
    img_fg = Image.open(master_fg)
    
    # Save standard densities:
    # mdpi: 48x48
    # hdpi: 72x72
    # xhdpi: 96x96
    # xxhdpi: 144x144
    # xxxhdpi: 192x192
    # playstore / pwa: 512x512
    densities = {
        'mdpi': (48, 108),
        'hdpi': (72, 162),
        'xhdpi': (96, 216),
        'xxhdpi': (144, 324),
        'xxxhdpi': (192, 432),
    }
    
    for density, (icon_s, fg_s) in densities.items():
        d_square = img_square.resize((icon_s, icon_s), Image.Resampling.LANCZOS)
        d_round = img_round.resize((icon_s, icon_s), Image.Resampling.LANCZOS)
        d_fg = img_fg.resize((fg_s, fg_s), Image.Resampling.LANCZOS)
        
        d_square.save(os.path.join(icons_dir, f'ic_launcher_{density}.png'), 'PNG')
        d_round.save(os.path.join(icons_dir, f'ic_launcher_round_{density}.png'), 'PNG')
        d_fg.save(os.path.join(icons_dir, f'ic_launcher_fg_{density}.png'), 'PNG')
        print(f'Density {density}: launcher={icon_s}x{icon_s}, fg={fg_s}x{fg_s}')
    
    # 512x512 for Google Play & Web PWA
    img_square.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, 'icon_512.png'), 'PNG')
    img_round.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, 'icon_512_round.png'), 'PNG')
    
    # Also update public/icon-192.png and public/icon-512.png
    shutil.copyfile(os.path.join(icons_dir, 'ic_launcher_xxxhdpi.png'), 'public/icon-192.png')
    shutil.copyfile(os.path.join(icons_dir, 'icon_512.png'), 'public/icon-512.png')
    print('All icons generated successfully and synced to public/!')

if __name__ == '__main__':
    main()
