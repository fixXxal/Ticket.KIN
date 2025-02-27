const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const https = require('https');
const httpsOptions = require('./httpsConfig');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/book', async (req, res) => {
    try {
        const { name, seat, route, departure, price, jetty } = req.body;

        // Generate QR code
        const qrCodeData = await QRCode.toDataURL(`${name}-${seat}`);

        // Generate HTML content
        const ticketHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>KIN Ferry Service - Ticket</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 2px solid black; border-radius: 10px; background-color: #f9f9f9; }
                    .header { text-align: center; font-size: 24px; font-weight: bold; }
                    .ticket-details { margin-top: 20px; padding: 10px; border: 1px solid #ccc; background: white; }
                    .ticket-details p { margin: 5px 0; }
                    .qr-code { text-align: center; margin-top: 15px; }
                    .terms { font-size: 12px; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">KIN Ferry Service - Boarding Ticket</div>
                <div class="ticket-details">
                    <p><strong>Passenger:</strong> ${name}</p>
                    <p><strong>Seat No.:</strong> ${seat}</p>
                    <p><strong>Trip Route:</strong> ${route}</p>
                    <p><strong>Departure Time:</strong> ${departure}</p>
                    <p><strong>Price:</strong> ${price} MVR</p>
                    <p><strong>Jetty:</strong> ${jetty}</p>
                    <p><strong>Bank Transfer Details:</strong> BML - 770123456789 (KIN Ferry Service)</p>
                </div>
                <div class="qr-code">
                    <img src="${qrCodeData}" alt="QR Code">
                </div>
                <div class="terms">
                    <p><strong>Terms & Conditions:</strong></p>
                    <p>- Please keep this ticket while boarding.</p>
                    <p>- Refund requests must be made 48 hours before departure.</p>
                    <p>- Arrive at least 15 minutes before departure.</p>
                    <p>- No refunds for completed trips.</p>
                </div>
            </body>
            </html>
        `;

        // Create a unique filename for the ticket
        const ticketFilename = `ticket_${name.replace(/\s+/g, '_')}_${Date.now()}.html`;
        const ticketPath = path.join(__dirname, 'public', ticketFilename);
        fs.writeFileSync(ticketPath, ticketHtml);

        // Generate PDF from HTML
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`file://${ticketPath}`, { waitUntil: 'networkidle0' });
        const pdfPath = ticketPath.replace('.html', '.pdf');
        await page.pdf({ path: pdfPath, format: 'A4' });
        await browser.close();

        // Redirect to the unique ticket page
        res.status(200).json({ message: 'Booking successful', redirectUrl: `/${ticketFilename.replace('.html', '.pdf')}` });
    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

https.createServer(httpsOptions, app).listen(3000, () => {
    console.log('Server is running on port 3000');
});
