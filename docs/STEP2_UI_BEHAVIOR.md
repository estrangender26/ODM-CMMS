# Step 2 UI Behavior: System Templates

## System Template Indicators

### Badge Display
System templates MUST display a visual indicator:
- **Badge text**: "System" or "Global"
- **Tooltip**: "This is a system template. Clone to customize."
- **Style**: Distinct color (e.g., blue or gray) to differentiate from organization templates

### Template List View
```
[Template Name]          [System Badge]  [Clone Button]
[Description]            
[Equipment Type] | [Industry]
```

### Template Detail View
For system templates (`is_system = TRUE`):
- ✅ Show "System Template" badge prominently
- ✅ Show "Parent of: X clones" (if applicable)
- ✅ Show "Clone" button (primary action)
- ❌ Hide Edit button
- ❌ Hide Delete button
- ❌ Disable inline editing

For organization templates (`is_system = FALSE`):
- Show "Organization Template" badge (if parent_template_id exists, show "Clone of: [Parent]")
- Show Edit button
- Show Delete button
- Hide Clone button (or show as secondary)

## Clone Action Flow

### Button State
```javascript
if (template.is_system) {
  // Primary action
  showCloneButton({ 
    variant: 'primary',
    text: 'Clone to Organization',
    onClick: openCloneDialog
  });
  hideEditButton();
  hideDeleteButton();
} else {
  // Standard actions
  showEditButton();
  showDeleteButton();
  hideCloneButton(); // Or show as "Duplicate"
}
```

### Clone Dialog
1. **Modal Title**: "Clone System Template"
2. **Fields**:
   - Template Name (pre-filled: "{Original} (Copy)", editable)
   - Template Code (optional, editable)
   - Description (pre-filled, editable)
3. **Validation**:
   - Name is required
   - Code must be unique within organization
4. **Actions**:
   - "Clone" (primary)
   - "Cancel"
5. **Post-Clone**:
   - Navigate to cloned template detail
   - Show success toast: "Template cloned successfully"

## Industry Selection UI

### Organization Settings
- **Section**: "Industries"
- **List**: Multi-select with checkboxes
- **Default Indicator**: Radio button or star icon
- **Constraints**:
  - Cannot uncheck last industry (block with tooltip)
  - Must select exactly one default (auto-select first if only one)

### Industry Assignment Flow
```
[ ] Water & Wastewater Utilities    (o) Default
[x] Buildings & Facilities          ( ) Set Default
[ ] Manufacturing                   ( ) Set Default

[Save Changes]
```

### Validation Messages
- "Organization must have at least one industry"
- "Select a default industry before removing this one"

## Error Handling

### System Template Edit Attempt
```javascript
// API returns 403
{
  success: false,
  message: 'System templates cannot be modified. Clone the template to make changes.',
  code: 'SYSTEM_TEMPLATE_IMMUTABLE',
  data: {
    clone_url: '/api/task-templates/123/clone'
  }
}

// UI shows modal instead of error toast
showClonePrompt({
  title: 'Cannot Edit System Template',
  message: 'This is a protected system template. Clone it to make changes.',
  primaryAction: 'Clone Now',
  secondaryAction: 'Cancel'
});
```

## Responsive Behavior

### Mobile
- System badge shown inline with name
- Clone button in action bar
- Edit/Delete hidden for system templates

### Desktop
- System badge in metadata row
- Clone button in header actions
- Full toolbar for organization templates
