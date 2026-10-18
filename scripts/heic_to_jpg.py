# Usage: python scripts/heic_to_jpg.py in.heic out.jpg  (needs pillow + pillow-heif)
import sys
from PIL import Image, ImageOps
import pillow_heif

pillow_heif.register_heif_opener()
img = ImageOps.exif_transpose(Image.open(sys.argv[1])).convert('RGB')
img.save(sys.argv[2], quality=92)
