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

            let mediaElement;
            if (file.type.startsWith('image/')) {
                mediaElement = document.createElement('img');
            } else if (file.type.startsWith('video/')) {
                mediaElement = document.createElement('video');
                mediaElement.controls = true;
            }
            mediaElement.src = e.target.result;

            const p = document.createElement('p');
            p.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

            const progress = document.createElement('progress');
            progress.value = 0;
            progress.max = 100;
            progress.style.display = 'none';

            div.appendChild(mediaElement);
            div.appendChild(p);
            div.appendChild(progress);
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
    let compressedFileCount = 0;

    const compressionPromises = selectedFiles.map(async (file, i) => {
        const previewItem = preview.children[i];
        const p = previewItem.querySelector('p');
        const progress = previewItem.querySelector('progress');

        let compressedFile;
        let compressedFileName;

        console.log(`Compressing file: ${file.name}, type: ${file.type}`);
        if (file.type.startsWith('image/')) {
            console.log('Calling compressImage');
            compressedFile = await compressImage(file);
            compressedFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg';
        } else if (file.type.startsWith('video/')) {
            console.log('Calling compressVideo');
            progress.style.display = 'block';
            compressedFile = await compressVideo(file, (p) => {
                progress.value = p;
            });
            progress.style.display = 'none';
            compressedFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.mp4';
        }

        if (compressedFile) {
            zip.file(compressedFileName, compressedFile);
            compressedFileCount++;
            p.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`;
        }
    });

    await Promise.all(compressionPromises);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    downloadLink.href = url;
    downloadLink.download = 'compressed_files.zip';
    downloadLink.style.display = 'block';
    downloadLink.textContent = `Download ${compressedFileCount} compressed files`;

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

const { FFmpeg } = self.FFmpeg;
const { toBlobURL } = self.FFmpegUtil;
let ffmpeg;

const loadFFmpeg = async () => {
    if (!ffmpeg) {
        console.log('Loading ffmpeg...');
        ffmpeg = new FFmpeg();
        ffmpeg.on('log', ({ message }) => {
            console.log(message);
        });
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        console.log('ffmpeg loaded');
    }
};

async function compressVideo(file, progressCallback) {
    console.log(`Compressing video: ${file.name}`);
    await loadFFmpeg();
    console.log('ffmpeg is ready for video compression');

    ffmpeg.on('progress', ({ progress }) => {
        progressCallback(progress * 100);
    });

    const inputFileName = file.name;
    const outputFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.mp4';

    await ffmpeg.writeFile(inputFileName, new Uint8Array(await file.arrayBuffer()));

    await ffmpeg.exec(['-i', inputFileName, '-c:v', 'libx264', '-crf', '28', outputFileName]);

    const data = await ffmpeg.readFile(outputFileName);

    return new Blob([new Uint8Array(data)], { type: 'video/mp4' });
}

loadFFmpeg().catch(err => console.error(err));
