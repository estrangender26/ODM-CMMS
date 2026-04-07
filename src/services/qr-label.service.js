/**
 * QR Label Generation Service
 * Generates printable QR labels for ODM assets
 */

const { getDb } = require('../config/database');
const db = getDb();

class QRLabelService {
  _getQRCode() {
    return require('qrcode');
  }

  _getPDFDocument() {
    return require('pdfkit');
  }

  /**
   * Build QR URL for asset scanning
   * Encodes /mobile/asset?code={asset_code} for direct mobile access
   */
  buildQRUrl(asset, baseUrl) {
    const host = baseUrl || '';
    return `${host}/mobile/asset?code=${encodeURIComponent(asset.code)}`;
  }

  /**
   * Generate QR code data for asset
   * Returns URL format for direct scanning, or raw code if no baseUrl
   */
  generateQRData(asset, baseUrl) {
    // Full URL enables direct mobile browser/app opening
    return this.buildQRUrl(asset, baseUrl);
  }

  /**
   * Generate QR code image as base64
   */
  async generateQRImage(qrData, options = {}) {
    const size = options.size || 200;
    const qrOptions = {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H' // High - good for industrial environments
    };

    try {
      const dataUrl = await this._getQRCode().toDataURL(qrData, qrOptions);
      return dataUrl;
    } catch (err) {
      console.error('QR generation error:', err);
      throw err;
    }
  }

  /**
   * Store QR code in database for asset
   */
  async storeQRCode(assetId, qrData) {
    try {
      const sql = `
        UPDATE equipment 
        SET qr_code = ?,
            qr_data = ?,
            qr_generated_at = NOW()
        WHERE id = ?
      `;
      await db.query(sql, [qrData, qrData, assetId]);
    } catch (err) {
      // Columns may not exist, that's okay
      console.log('[QR] Could not store QR code:', err.message);
    }
    return qrData;
  }

  /**
   * Generate and store QR for single asset
   */
  async generateForAsset(assetId, baseUrl) {
    // Get asset details
    const sql = `
      SELECT e.id, e.code, e.name, et.type_name as equipment_type
      FROM equipment e
      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
      WHERE e.id = ?
    `;
    const rows = await db.query(sql, [assetId]);
    const asset = rows[0];
    
    if (!asset) {
      throw new Error('Asset not found: ' + assetId);
    }

    const qrData = this.generateQRData(asset, baseUrl);
    
    // Try to store QR code, but don't fail if columns don't exist
    try {
      await this.storeQRCode(assetId, qrData);
    } catch (storeErr) {
      console.log('[QR] Could not store QR code in DB (columns may not exist):', storeErr.message);
    }
    
    return {
      asset: asset,
      qrData: qrData,
      qrImage: await this.generateQRImage(qrData)
    };
  }

  /**
   * Generate QR for multiple assets (batch)
   */
  async generateForAssets(assetIds, baseUrl) {
    const results = [];
    for (const id of assetIds) {
      try {
        const result = await this.generateForAsset(id, baseUrl);
        results.push(result);
      } catch (err) {
        console.error(`Failed to generate QR for asset ${id}:`, err);
        results.push({ assetId: id, error: err.message });
      }
    }
    return results;
  }

  /**
   * Generate single label image (PNG) - NOT IMPLEMENTED (requires canvas)
   * Use generateLabelPDF for PDF output instead
   */
  async generateLabelImage(asset, options = {}) {
    throw new Error('PNG generation not available. Please use PDF format.');
  }

  /**
   * Generate PDF with single label
   */
  async generateLabelPDF(asset, options = {}) {
    const size = options.size || '70x40';
    const isSmall = size === '50x30';
    
    const docWidth = isSmall ? 142 : 198; // 50mm/70mm in points
    const docHeight = isSmall ? 85 : 113; // 30mm/40mm in points
    
    const doc = new (this._getPDFDocument())({ size: [docWidth, docHeight] });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      try {
        const qrData = this.generateQRData(asset, options.baseUrl);
        const qrDataUrl = await this.generateQRImage(qrData, { size: 150 });
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

        // White background
        doc.rect(0, 0, docWidth, docHeight).fill('#FFFFFF');

        if (isSmall) {
          // Compact layout
          doc.image(qrBuffer, 8, 8, { width: 55, height: 55 });

          doc.font('Helvetica-Bold').fontSize(11);
          doc.fillColor('#000000');
          doc.text(asset.name, 70, 10, { width: 65, ellipsis: true });

          doc.font('Helvetica').fontSize(8);
          doc.fillColor('#666666');
          doc.text(asset.code, 70, 30);

          if (asset.equipment_type) {
            doc.fontSize(7);
            doc.fillColor('#999999');
            doc.text(asset.equipment_type, 70, 42);
          }

          doc.fontSize(7);
          doc.fillColor('#1976d2');
          doc.text('Scan', 8, 68);
        } else {
          // Standard layout
          doc.image(qrBuffer, 10, 10, { width: 80, height: 80 });

          doc.font('Helvetica-Bold').fontSize(14);
          doc.fillColor('#000000');
          doc.text(asset.name, 100, 15, { width: 88, ellipsis: true });

          doc.font('Helvetica').fontSize(10);
          doc.fillColor('#666666');
          doc.text(asset.code, 100, 45);

          if (asset.equipment_type) {
            doc.fontSize(9);
            doc.fillColor('#999999');
            doc.text(asset.equipment_type, 100, 60);
          }

          doc.fontSize(8);
          doc.fillColor('#1976d2');
          doc.text('Scan to inspect', 10, 95);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate batch PDF with multiple labels
   * Supports configurable label size
   */
  async generateBatchPDF(assets, options = {}) {
    const size = options.size || '70x40';
    const isSmall = size === '50x30';
    
    const pageWidth = 595;  // A4 width in points
    const pageHeight = 842; // A4 height in points
    const labelWidth = isSmall ? 142 : 198;  // 50mm/70mm in points
    const labelHeight = isSmall ? 85 : 113;  // 30mm/40mm in points
    const cols = 2;
    const rows = isSmall ? 7 : 5;
    const labelsPerPage = cols * rows;
    const xStart = isSmall ? 40 : 50;
    const xGap = isSmall ? 30 : 20;
    const yStart = isSmall ? 30 : 50;
    const yGap = isSmall ? 10 : 15;
    
    const doc = new (this._getPDFDocument())({ size: 'A4' });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise(async (resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      try {
        let labelIndex = 0;

        for (const asset of assets) {
          console.log('[QR-PDF] Processing label', labelIndex + 1, 'for', asset.code);
          
          // Add new page if needed
          if (labelIndex > 0 && labelIndex % labelsPerPage === 0) {
            doc.addPage();
          }

          // Calculate position
          const col = labelIndex % cols;
          const row = Math.floor((labelIndex % labelsPerPage) / cols);
          const x = xStart + (col * (labelWidth + xGap));
          const y = yStart + (row * (labelHeight + yGap));

          // Generate QR
          const qrData = this.generateQRData(asset, options.baseUrl);
          console.log('[QR-PDF] QR data:', qrData.substring(0, 50) + '...');
          
          const qrDataUrl = await this.generateQRImage(qrData, { size: 150 });
          const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

          // Draw label border
          doc.rect(x, y, labelWidth, labelHeight).stroke('#CCCCCC');

          // Get display values with fallbacks
          const assetName = asset.name || 'Unknown';
          const assetCode = asset.code || 'N/A';
          const equipmentType = asset.equipment_type || asset.type_name || '';

          if (isSmall) {
            // Compact label layout
            doc.image(qrBuffer, x + 6, y + 6, { width: 50, height: 50 });

            doc.font('Helvetica-Bold').fontSize(9);
            doc.fillColor('#000000');
            doc.text(assetName, x + 62, y + 8, { width: 72, ellipsis: true });

            doc.font('Helvetica').fontSize(7);
            doc.fillColor('#666666');
            doc.text(assetCode, x + 62, y + 24);

            if (equipmentType) {
              doc.fontSize(6);
              doc.fillColor('#999999');
              doc.text(equipmentType.substring(0, 22), x + 62, y + 35);
            }

            doc.fontSize(6);
            doc.fillColor('#1976d2');
            doc.text('Scan', x + 6, y + 62);
          } else {
            // Standard label layout
            doc.image(qrBuffer, x + 8, y + 8, { width: 70, height: 70 });

            doc.font('Helvetica-Bold').fontSize(11);
            doc.fillColor('#000000');
            doc.text(assetName, x + 85, y + 10, { width: 100, ellipsis: true });

            doc.font('Helvetica').fontSize(9);
            doc.fillColor('#666666');
            doc.text(assetCode, x + 85, y + 35);

            if (equipmentType) {
              doc.fontSize(8);
              doc.fillColor('#999999');
              doc.text(equipmentType.substring(0, 20), x + 85, y + 50);
            }

            doc.fontSize(7);
            doc.fillColor('#1976d2');
            doc.text('Scan to inspect', x + 8, y + 85);
          }

          labelIndex++;
        }

        console.log('[QR-PDF] Finalizing PDF...');
        doc.end();
      } catch (err) {
        console.error('[QR-PDF] Error:', err);
        reject(err);
      }
    });
  }

  /**
   * Lookup asset by QR code
   */
  async lookupByQR(qrCode) {
    const sql = `
      SELECT e.id, e.code, e.name, e.equipment_type_id,
             f.id as facility_id, f.name as facility_name,
             e.organization_id
      FROM equipment e
      JOIN facilities f ON e.facility_id = f.id
      WHERE e.qr_code = ? OR e.code = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [qrCode, qrCode]);
    return rows[0] || null;
  }
}

module.exports = new QRLabelService();
