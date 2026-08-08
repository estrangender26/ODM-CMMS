/** Multipart safeguards for CSV asset imports. */
const multer = require('multer');
const os = require('os');

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 20 },
  fileFilter: (req, file, cb) => {
    // Extension/MIME are only an early filter. The controller parses and validates CSV headers.
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    }
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
  }
});

const handleAssetImportUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'CSV file exceeds the 5MB limit' : 'Invalid CSV upload';
    return res.status(status).json({ success: false, message });
  }
  return res.status(400).json({ success: false, message: 'Invalid CSV upload' });
};

module.exports = { assetImportUpload: upload, handleAssetImportUploadError };
