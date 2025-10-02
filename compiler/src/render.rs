use fast_image_resize::{self as fr, images::Image};
use fr::Resizer;
use typst::model::Document;
use wasm_bindgen::Clamped;
use web_sys::ImageData;

pub fn to_image(
    resizer: &mut Resizer,
    document: Document,
    pixel_per_pt: f32,
    fill: String,
    size: u32,
    display: bool,
) -> Result<ImageData, wasm_bindgen::JsValue> {
    let mut pixmap = typst_render::render(&document.pages[0], pixel_per_pt);

    // Apply fill color if provided (similar to temp_repo logic)
    if !fill.is_empty() {
        // Parse hex color and apply transparency
        // This matches the fill logic from temp_repo
        let fill_bytes = hex::decode(&fill[1..]).unwrap_or_default();
        if fill_bytes.len() >= 4 {
            let r = fill_bytes[0];
            let g = fill_bytes[1]; 
            let b = fill_bytes[2];
            let a = fill_bytes[3];
            
            if a > 0 {
                // Apply background fill
                for pixel in pixmap.pixels_mut() {
                    if pixel.alpha() == 0 {
                        *pixel = tiny_skia::ColorU8::from_rgba(r, g, b, a).premultiply();
                    }
                }
            }
        }
    }

    let width = pixmap.width();
    let height = pixmap.height();
    // Create src image
    let mut src_image =
        Image::from_slice_u8(width, height, pixmap.data_mut(), fr::PixelType::U8x4).unwrap();

    // Multiple RGB channels of source image by alpha channel
    let alpha_mul_div = fr::MulDiv::default();
    alpha_mul_div
        .multiply_alpha_inplace(&mut src_image)
        .unwrap();

    let dst_width = if display {
        size
    } else {
        ((size as f32 / height as f32) * width as f32) as u32
    };
    let dst_height = if display {
        ((size as f32 / width as f32) * height as f32) as u32
    } else {
        size
    };

    // Create container for data of destination image
    let mut dst_image = Image::new(dst_width, dst_height, src_image.pixel_type());

    // Resize source image into buffer of destination image
    resizer.resize(&src_image, &mut dst_image, None).unwrap();

    alpha_mul_div.divide_alpha_inplace(&mut dst_image).unwrap();

    return ImageData::new_with_u8_clamped_array_and_sh(
        Clamped(dst_image.buffer()),
        dst_width,
        dst_height,
    );
}

pub fn to_svg(document: Document) -> String {
    typst_svg::svg(&document.pages[0])
}

pub fn to_pdf(document: Document) -> Result<Vec<u8>, wasm_bindgen::JsValue> {
    // Use typst_pdf to compile document to PDF bytes with default options
    // Available fields: ident, timestamp, page_ranges, standards
    let pdf_options = typst_pdf::PdfOptions::default();
    
    match typst_pdf::pdf(&document, &pdf_options) {
        Ok(pdf_bytes) => Ok(pdf_bytes),
        Err(e) => Err(wasm_bindgen::JsValue::from_str(&format!("PDF compilation failed: {:?}", e)))
    }
}