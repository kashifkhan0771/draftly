package export

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/jung-kurt/gofpdf"
)

// stripHTML removes HTML tags and decodes common entities for plain-text PDF output.
func stripHTML(html string) string {
	// Replace <br>, <br/>, </p>, </li> with newlines
	re := regexp.MustCompile(`(?i)<br\s*/?>|</p>|</li>|</h[1-6]>`)
	text := re.ReplaceAllString(html, "\n")

	// Remove all remaining tags
	re = regexp.MustCompile(`<[^>]*>`)
	text = re.ReplaceAllString(text, "")

	// Decode common HTML entities
	text = strings.ReplaceAll(text, "&amp;", "&")
	text = strings.ReplaceAll(text, "&lt;", "<")
	text = strings.ReplaceAll(text, "&gt;", ">")
	text = strings.ReplaceAll(text, "&quot;", "\"")
	text = strings.ReplaceAll(text, "&#39;", "'")
	text = strings.ReplaceAll(text, "&nbsp;", " ")

	// Collapse multiple blank lines
	re = regexp.MustCompile(`\n{3,}`)
	text = re.ReplaceAllString(text, "\n\n")

	return strings.TrimSpace(text)
}

// ToPDF generates a PDF from a note title and HTML content, returning the PDF bytes. #draftly
func ToPDF(title, htmlContent string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	// Title
	if title != "" {
		pdf.SetFont("Helvetica", "B", 18)
		pdf.MultiCell(0, 8, title, "", "L", false)
		pdf.Ln(4)
	}

	// Body
	text := stripHTML(htmlContent)
	if text == "" {
		text = "(empty note)"
	}

	pdf.SetFont("Helvetica", "", 11)
	pdf.MultiCell(0, 6, text, "", "L", false)

	var buf strings.Builder
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("generate PDF: %w", err)
	}

	return []byte(buf.String()), nil
}
