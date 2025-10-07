use std::cell::OnceCell;

use typst::{ foundations::Bytes, syntax::{ FileId, Source } };

pub enum FileContent {
    Text(String),
    Binary(Vec<u8>),
}

pub struct FileEntry {
    id: FileId,
    content: FileContent,
    bytes: OnceCell<Bytes>,
    source: OnceCell<Source>,
}

impl FileEntry {
    pub fn new(id: FileId, text: String) -> Self {
        Self {
            id,
            content: FileContent::Text(text),
            bytes: OnceCell::new(),
            source: OnceCell::new(),
        }
    }

    pub fn new_binary(id: FileId, data: Vec<u8>) -> Self {
        Self {
            id,
            content: FileContent::Binary(data),
            bytes: OnceCell::new(),
            source: OnceCell::new(),
        }
    }

    pub fn source(&self) -> Source {
        self.source
            .get_or_init(|| {
                match &self.content {
                    FileContent::Text(text) => Source::new(self.id, text.clone()),
                    FileContent::Binary(_) => Source::new(self.id, String::new()),
                }
            })
            .clone()
    }

    pub fn bytes(&self) -> Bytes {
        self.bytes
            .get_or_init(|| {
                match &self.content {
                    FileContent::Text(text) => Bytes::new(text.as_bytes().to_vec()),
                    FileContent::Binary(data) => Bytes::new(data.clone()),
                }
            })
            .clone()
    }
}
