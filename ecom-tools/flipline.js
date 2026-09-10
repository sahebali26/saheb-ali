// vertical line
                        a4Page.drawLine({
                            start: { x: a4Width / 2, y: margin },
                            end: { x: a4Width / 2, y: a4Height - margin },
                            thickness: 2,
                            color: PDFLib.rgb(0.5, 0.5, 0.5)
                        });
                        // horizontal line
                        a4Page.drawLine({
                            start: { x: margin, y: a4Height / 2 },
                            end: { x: a4Width - margin, y: a4Height / 2 },
                            thickness: 2,
                            color: PDFLib.rgb(0.5, 0.5, 0.5)
                        });
