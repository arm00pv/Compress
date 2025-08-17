const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const compressBtn = document.getElementById('compressBtn');
const downloadLink = document.getElementById('downloadLink');

let selectedFiles = [];

imageInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    preview.innerHTML = '';
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.classList.add('preview-item');
            const img = document.createElement('img');
            img.src = e.target.result;
            const p = document.createElement('p');
            p.textContent = `${(file.size / 1024).toFixed(2)} KB`;
            div.appendChild(img);
            div.appendChild(p);
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
    compressBtn.disabled = selectedFiles.length === 0;
});

compressBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    compressBtn.disabled = true;
    compressBtn.textContent = 'Compressing...';

    const zip = new JSZip();
    const compressedImages = [];

    for (const [i, file] of selectedFiles.entries()) {
        const compressedFile = await compressImage(file);
        const compressedFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg';
        zip.file(compressedFileName, compressedFile);
        compressedImages.push(compressedFile);

        // Update UI
        const previewItem = preview.children[i];
        const p = previewItem.querySelector('p');
        p.textContent = `${(file.size / 1024).toFixed(2)} KB -> ${(compressedFile.size / 1024).toFixed(2)} KB`;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    downloadLink.href = url;
    downloadLink.download = 'compressed_images.zip';
    downloadLink.style.display = 'block';
    downloadLink.textContent = `Download ${compressedImages.length} compressed images`;

    compressBtn.disabled = false;
    compressBtn.textContent = 'Compress and Add to Zip';
});

async function compressImage(file) {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
    };
    try {
        const compressedFile = await imageCompression(file, options);
        console.log(`Compressed ${file.name} from ${(file.size / 1024 / 1024).toFixed(2)} MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
        return compressedFile;
    } catch (error) {
        console.error(error);
        return file; // return original file if compression fails
    }
}
