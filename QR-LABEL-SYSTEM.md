# QR Label System for ODM-CMMS

## Overview

The QR Label System enables generating printable QR code labels for ODM assets. These labels encode asset identifiers that allow operators to quickly scan and access asset context to start inspections.

## Features

- **Single Label Generation**: Generate and print individual QR labels for specific assets
- **Batch PDF Generation**: Generate PDF with multiple labels for bulk printing
- **Label Sizes**: Support for 50mm x 30mm and 70mm x 40mm label formats
- **Print & Share**: Print directly, download PDF, or share QR codes
- **Mobile-First UI**: Optimized for mobile devices used by maintenance operators

## QR Data Format

### Asset Code Format (Recommended)
The QR code encodes the asset's unique code:
```
ODM-AST-001
```

### URL Format (Alternative)
Full URL for direct browser access:
```
https://odm.example.com/mobile/asset?code=ODM-AST-001
```

## Database Schema

### Equipment Table Columns
```sql
ALTER TABLE equipment 
ADD COLUMN qr_code VARCHAR(100) NULL,
ADD COLUMN qr_data VARCHAR(500) NULL,
ADD COLUMN qr_generated_at DATETIME NULL;

CREATE INDEX idx_equipment_qr_code ON equipment(qr_code);
```

## API Endpoints

### Get QR Code for Asset
```
GET /api/assets/:id/qr
```
Returns QR data and base64 image for an asset.

### Download Single Label (PNG)
```
GET /api/assets/:id/qr-label.png
```
Downloads a PNG image of the label.

### Download Single Label (PDF)
```
GET /api/assets/:id/qr-label.pdf
```
Downloads a PDF with the label (70mm x 40mm).

### Generate Batch PDF
```
POST /api/assets/qr-labels/batch
Content-Type: application/json

{
  "assetIds": [1, 2, 3, 4, 5]
}
```
Generates a PDF with multiple labels (2 columns x 5 rows per A4 page).

### Regenerate QR Code
```
POST /api/assets/:id/qr/regenerate
```
Regenerates the QR code for an asset.

## Mobile UI Routes

### View QR Label
```
GET /mobile/assets/:id/qr-label
```
Mobile UI for viewing and printing a single QR label.

### Batch QR Generation
```
GET /mobile/qr-labels/batch
```
Mobile UI for selecting multiple assets and generating batch PDF.

## Label Layout

### 70mm x 40mm Label
```
┌─────────────────────────────────────┐
│  ┌──────┐  Asset Name (bold)        │
│  │      │  ODM-AST-001              │
│  │  QR  │  Centrifugal Pump         │
│  │ Code │                           │
│  │      │  [Scan to inspect]        │
│  └──────┘                           │
└─────────────────────────────────────┘
```

### 50mm x 30mm Label (Compact)
Smaller format for tight spaces, with condensed information.

## Workflow

### For Operators
1. **Scan QR Label**: Use phone camera or ODM mobile app
2. **Asset Context**: View asset details and open work orders
3. **Start Inspection**: Select work order and begin inspection

### For Supervisors/Admins
1. **Generate QR Labels**: Go to Admin Tools → QR Labels
2. **Select Assets**: Choose assets needing labels
3. **Download PDF**: Get batch PDF for printing
4. **Print & Attach**: Print on label printer and attach to assets

## Dependencies

```json
{
  "qrcode": "^1.5.3",
  "canvas": "^2.11.2",
  "pdfkit": "^0.14.0"
}
```

## Configuration

### Environment Variables
None required. QR generation works out of the box.

### Label Printer Settings
- **Resolution**: 300 DPI recommended
- **Paper**: Thermal label paper or adhesive labels
- **Size**: 70mm x 40mm or 50mm x 30mm

## Integration Points

### Asset Creation/Import
QR codes are automatically generated when:
- New assets are created via API
- Assets are imported via CSV
- Assets are created through onboarding wizard

### Mobile Scanning
The mobile app handles QR scanning:
```javascript
// Scan → Decode → Lookup → Navigate
/mobile/asset?code=ODM-AST-001
```

## Security Considerations

1. **QR Code Data**: Only contains asset code, no sensitive data
2. **Lookup Security**: Asset lookup requires authentication
3. **Organization Isolation**: QR codes are unique within organization
4. **No Direct URLs**: Asset codes don't expose internal IDs

## Error Handling

### Invalid QR Code
If a QR code doesn't match any asset:
- Mobile app shows "Asset Not Found" error
- Suggests checking QR code or contacting admin

### Missing QR Code
If an asset has no QR code:
- Shows "Generate QR" button in asset context
- Allows on-demand QR generation

## Future Enhancements

- [ ] Custom label templates
- [ ] Color-coded labels by criticality
- [ ] NFC tag generation
- [ ] QR code with logo overlay
- [ ] Barcode (Code 128) option
- [ ] Direct thermal printer support

## Testing

### Manual Testing Checklist
- [ ] Generate QR for single asset
- [ ] Download single label PNG
- [ ] Download single label PDF
- [ ] Generate batch PDF (10+ assets)
- [ ] Print labels on actual printer
- [ ] Scan QR with mobile camera
- [ ] Scan QR with ODM app
- [ ] Verify asset lookup works
- [ ] Test label sizes (50x30, 70x40)

## Troubleshooting

### QR Not Generating
1. Check database columns exist
2. Run migration: `database/migrations/add_qr_code_to_equipment.sql`
3. Verify dependencies installed: `npm install`

### PDF Not Downloading
1. Check assets exist and are accessible
2. Verify user has VIEW permission on ASSETS
3. Check server logs for errors

### Labels Printing Incorrectly
1. Verify printer DPI settings (300 recommended)
2. Check label size matches physical labels
3. Adjust print margins in browser

## Support

For issues or questions about the QR Label System, refer to:
- Main README.md
- API documentation
- Mobile UI help within the app
