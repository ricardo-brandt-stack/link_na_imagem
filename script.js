let imageBuffer = null;
let imageMimeType = 'image/png';
let imageSrcData = null;
let imageWidth = 0;
let imageHeight = 0;

// ELEMENTOS DOM
const themeToggleBtn = document.getElementById('theme-toggle');
const dropZone = document.getElementById('drop-zone');
const dropText = document.getElementById('drop-text');
const imageInput = document.getElementById('image-input');
const linkUrlInput = document.getElementById('link-url');
const checkNewTab = document.getElementById('check-new-tab');

const previewSection = document.getElementById('preview-section');
const previewLink = document.getElementById('preview-link');
const previewImg = document.getElementById('preview-img');

const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnDownloadHtml = document.getElementById('btn-download-html');
const statusText = document.getElementById('status-text');

// 1. TEMA CLARO / ESCURO
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        themeToggleBtn.innerText = isLight ? '☀️ Claro' : '🌙 Escuro';
    });
}

// 2. SELEÇÃO DA IMAGEM
dropZone.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) processImage(e.target.files[0]);
});

dropZone.addEventListener('dragover', (e) => e.preventDefault());
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) processImage(e.dataTransfer.files[0]);
});

async function processImage(file) {
    imageMimeType = file.type || 'image/png';
    imageBuffer = await file.arrayBuffer();

    const reader = new FileReader();
    reader.onload = (e) => {
        imageSrcData = e.target.result;
        
        const tempImg = new Image();
        tempImg.onload = () => {
            imageWidth = tempImg.width;
            imageHeight = tempImg.height;
            dropText.innerText = `🖼️ ${file.name} (${imageWidth}x${imageHeight}px)`;
            updatePreview();
        };
        tempImg.src = imageSrcData;
    };
    reader.readAsDataURL(file);
}

// 3. ATUALIZAR PRÉ-VISUALIZAÇÃO
[linkUrlInput, checkNewTab].forEach(elem => {
    elem.addEventListener('input', updatePreview);
    elem.addEventListener('change', updatePreview);
});

function updatePreview() {
    if (!imageSrcData) return;

    const url = linkUrlInput.value.trim() || '#';
    previewImg.src = imageSrcData;
    previewLink.href = url;
    previewLink.target = checkNewTab.checked ? '_blank' : '_self';

    previewSection.style.display = 'block';
}

// 4. BAIXAR COMO PDF INTERATIVO (PÁGINA AJUSTADA À IMAGEM)
btnDownloadPdf.addEventListener('click', async () => {
    const url = linkUrlInput.value.trim();
    if (!url) {
        alert('Por favor, informe a URL de destino primeiro!');
        return;
    }
    if (!imageBuffer) return;

    statusText.innerText = 'Gerando PDF interativo...';
    const { PDFDocument, PDFName, PDFString } = PDFLib;

    const pdfDoc = await PDFDocument.create();
    
    // Define a página exatamente no tamanho da imagem
    const page = pdfDoc.addPage([imageWidth, imageHeight]);

    let embeddedImage;
    if (imageMimeType.includes('png')) {
        embeddedImage = await pdfDoc.embedPng(imageBuffer);
    } else {
        embeddedImage = await pdfDoc.embedJpg(imageBuffer);
    }

    // Desenha a imagem preenchendo a folha
    page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imageWidth,
        height: imageHeight
    });

    // Anexa a anotação de link transparente sobre toda a imagem
    const linkAnnotation = pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [0, 0, imageWidth, imageHeight],
        Border: [0, 0, 0],
        A: {
            Type: 'Action',
            S: 'URI',
            URI: PDFString.of(url),
        },
    });

    const linkAnnRef = pdfDoc.context.register(linkAnnotation);
    
    let annots = page.node.get(PDFName.of('Annots'));
    if (!annots) {
        annots = pdfDoc.context.obj([]);
        page.node.set(PDFName.of('Annots'), annots);
    }
    annots.push(linkAnnRef);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'imagem_clicavel.pdf';
    link.click();

    statusText.innerText = 'PDF baixado com sucesso!';
    setTimeout(() => statusText.innerText = '', 3000);
});

// 5. BAIXAR COMO ATALHO / PACOTE WEB (.HTML)
btnDownloadHtml.addEventListener('click', () => {
    const url = linkUrlInput.value.trim();
    if (!url) {
        alert('Por favor, informe a URL de destino primeiro!');
        return;
    }
    if (!imageSrcData) return;

    const targetAttr = checkNewTab.checked ? '_blank' : '_self';

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Imagem Clicável</title>
    <style>
        body { margin: 0; padding: 0; background: #000; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        img { max-width: 100%; height: auto; cursor: pointer; }
    </style>
</head>
<body>
    <a href="${url}" target="${targetAttr}">
        <img src="${imageSrcData}" alt="Imagem Clicável">
    </a>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'imagem_clicavel.html';
    link.click();

    statusText.innerText = 'Arquivo .HTML baixado com sucesso!';
    setTimeout(() => statusText.innerText = '', 3000);
});