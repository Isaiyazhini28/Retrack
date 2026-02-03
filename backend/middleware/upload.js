import multer from "multer";
import path from "path";
import fs from "fs";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/others";

    if (file.fieldname === "photo") {
      uploadPath = "uploads/photos";
    } else if (file.fieldname === "resume") {
      uploadPath = "uploads/resumes";
    }

    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({ storage });
