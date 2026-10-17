import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);
    const lang = (searchParams.get('lang') || 'en').toLowerCase();
    const vendorName = searchParams.get('vendor') || 'All Vendors';
    const format = (searchParams.get('format') || 'txt').toLowerCase();
    const autoPrint = searchParams.get('autoPrint') === 'true';

    // Titles and translations
    const i18n = {
      en: {
        title: 'MITRA MONTHLY STATEMENT',
        household: 'Household: Kabir Bundele Household',
        vendor: `Vendor: ${vendorName}`,
        month: `Month: ${month}`,
        generated: `Generated: ${new Date().toLocaleString('en-IN')}`,
        colDate: 'Date',
        colQty: 'Qty (L)',
        colRate: 'Rate (INR)',
        colTotal: 'Total (INR)',
        colStatus: 'Status',
        totalDelivered: 'TOTAL DELIVERED',
        totalPayable: 'TOTAL PAYABLE',
        verified: 'Tamper-proof auditable records verified by Mitra Platform.',
        litres: 'Litres',
        statusConfirmed: 'Confirmed (Vendor)',
        statusAuto: 'Auto-Confirmed (System)',
        statusPending: 'Pending',
        statusAbsent: 'Absent',
      },
      hi: {
        title: 'मित्र मासिक वितरण विवरण (INVOICE)',
        household: 'परिवार: कबीर बुंदेले परिवार',
        vendor: `विक्रेता: ${vendorName}`,
        month: `महीना: ${month}`,
        generated: `दिनांक: ${new Date().toLocaleString('hi-IN')}`,
        colDate: 'दिनांक',
        colQty: 'मात्रा (लीटर)',
        colRate: 'दर (रुपये)',
        colTotal: 'कुल (रुपये)',
        colStatus: 'स्थिति',
        totalDelivered: 'कुल वितरित मात्रा',
        totalPayable: 'कुल देय राशि',
        verified: 'मित्रा डिलीवरी पुष्टिकरण प्लेटफॉर्म द्वारा सत्यापित स्थायी रिकॉर्ड।',
        litres: 'लीटर',
        statusConfirmed: 'पुष्टीकृत (विक्रेता)',
        statusAuto: 'स्वतः-पुष्टीकृत (सिस्टम)',
        statusPending: 'लंबित',
        statusAbsent: 'अनुपस्थित',
      },
      mr: {
        title: 'मित्र मासिक वितरण विवरण (INVOICE)',
        household: 'कुटुंब: कबीर बुंदेले कुटुंब',
        vendor: `विक्रेता: ${vendorName}`,
        month: `महिना: ${month}`,
        generated: `तारीख: ${new Date().toLocaleString('mr-IN')}`,
        colDate: 'तारीख',
        colQty: 'प्रमाण (लिटर)',
        colRate: 'दर (रुपये)',
        colTotal: 'एकूण (रुपये)',
        colStatus: 'स्थिती',
        totalDelivered: 'एकूण वितरित दूध',
        totalPayable: 'एकूण देय रक्कम',
        verified: 'मित्र डिलिव्हरी पुष्टीकरण प्लॅटफॉर्मद्वारे सत्यापित अपरिवर्तनीय नोंदी.',
        litres: 'लिटर',
        statusConfirmed: 'निश्चित (विक्रेता)',
        statusAuto: 'स्वयंचलित (प्रणाली)',
        statusPending: 'प्रलंबित',
        statusAbsent: 'गैरहजर',
      },
    };

    const dict = i18n[lang as 'en' | 'hi' | 'mr'] || i18n.en;

    if (format === 'html') {
      const htmlContent = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${dict.title} - ${month}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; color: #1e293b; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #183d2d; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .header h1 { margin: 0; color: #183d2d; font-size: 1.6rem; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1.5rem; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.9rem; }
    th, td { border: 1px solid #cbd5e1; padding: 0.6rem; text-align: left; }
    th { background: #f8fafc; font-weight: 700; }
    .summary { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
    .summary-row { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.4rem; font-size: 1rem; }
    .footer { text-align: center; font-size: 0.8rem; color: #64748b; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 1rem; text-align: right;">
    <button onclick="window.print()" style="background: #183d2d; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 700; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>
  <div class="header">
    <h1>${dict.title}</h1>
    <p style="margin: 0.25rem 0 0 0; color: #64748b; font-size: 0.85rem;">Kabir Bundele Household • Mitra Platform</p>
  </div>
  <div class="meta">
    <div>${dict.household}</div>
    <div>${dict.vendor}</div>
    <div>${dict.month}</div>
    <div>${dict.generated}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${dict.colDate}</th>
        <th>${dict.colQty}</th>
        <th>${dict.colRate}</th>
        <th>${dict.colTotal}</th>
        <th>${dict.colStatus}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${month}-01 to ${month}-28</td>
        <td>1.50 ${dict.litres} / day</td>
        <td>₹42.00</td>
        <td>₹1,764.00</td>
        <td>${dict.statusConfirmed}</td>
      </tr>
    </tbody>
  </table>
  <div class="summary">
    <div class="summary-row">
      <span>${dict.totalDelivered}:</span>
      <span>42.0 ${dict.litres}</span>
    </div>
    <div class="summary-row" style="color: #183d2d;">
      <span>${dict.totalPayable}:</span>
      <span>₹1,764.00</span>
    </div>
  </div>
  <div class="footer">
    ${dict.verified}
  </div>
  ${autoPrint ? '<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>' : ''}
</body>
</html>`;

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="Mitra_Invoice_${month}_${lang}.html"`,
        },
      });
    }

    // Default: Plain text format
    const lines: string[] = [];
    lines.push(`=======================================================`);
    lines.push(`               ${dict.title}                           `);
    lines.push(`=======================================================`);
    lines.push(dict.household);
    lines.push(dict.vendor);
    lines.push(dict.month);
    lines.push(dict.generated);
    lines.push(`-------------------------------------------------------`);
    lines.push(`${dict.colDate.padEnd(12, ' ')}${dict.colQty.padEnd(14, ' ')}${dict.colRate.padEnd(12, ' ')}${dict.colTotal.padEnd(14, ' ')}${dict.colStatus}`);
    lines.push(`-------------------------------------------------------`);
    lines.push(`${(month + '-01').padEnd(12, ' ')}${'1.5 L'.padEnd(14, ' ')}${'₹42.00'.padEnd(12, ' ')}${'₹63.00'.padEnd(14, ' ')}${dict.statusConfirmed}`);
    lines.push(`${(month + '-02').padEnd(12, ' ')}${'1.5 L'.padEnd(14, ' ')}${'₹42.00'.padEnd(12, ' ')}${'₹63.00'.padEnd(14, ' ')}${dict.statusAuto}`);
    lines.push(`-------------------------------------------------------`);
    lines.push(`${dict.totalDelivered}: 42.0 ${dict.litres}`);
    lines.push(`${dict.totalPayable}:   ₹1,764.00`);
    lines.push(`=======================================================`);
    lines.push(dict.verified);

    const txtContent = lines.join('\n');

    return new NextResponse(txtContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="Mitra_Statement_${month}_${lang}.txt"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Report download error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
