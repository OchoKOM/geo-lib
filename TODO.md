# TODO: Enhance GeoMap with Export Dialog and Drawing Workflow

## Export Dialog
- [ ] Add state for export dialog (open, filename, projection)
- [ ] Create export dialog UI with filename input and projection select (default EPSG:4326)
- [ ] Modify handleExport to open dialog instead of direct export
- [ ] Add confirmExport function to perform export with custom name and projection

## Drawing Workflow
- [ ] Add state for drawing mode (enabled/disabled), selected geometry type, selected layer for drawing
- [ ] Add UI in sidebar for geometry type selection and layer selection before drawing
- [ ] Modify draw control initialization to be disabled by default
- [ ] Add functions to enable/disable draw control based on selections
- [ ] Modify draw created handler to add features to selected layer instead of creating new layer

## Testing
- [ ] Test export dialog functionality
- [ ] Test drawing workflow with layer and geometry selection
