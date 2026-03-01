// GIF Comments for VibeHub
// Allows users to search and add GIFs to comments using Tenor API

let currentGifPostId = null;
let selectedGifUrl = null;

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public beta key
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

async function searchGifs(query, limit = 20) {
  try {
    const url = `${TENOR_BASE_URL}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&media_filter=gif,tinygif`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('GIF search error:', err);
    return [];
  }
}

function renderGifResults(gifs) {
  const container = document.getElementById('gif-results');
  if (!container) return;
  
  container.innerHTML = gifs.map(gif => {
    const url = gif.media_formats.tinygif.url || gif.media_formats.gif.url;
    return `<img src="${url}" onclick="selectGif('${url}')" style="width:100px;height:100px;object-fit:cover;cursor:pointer;border-radius:8px;margin:4px;">`;
  }).join('');
}

function selectGif(url) {
  selectedGifUrl = url;
}

async function gifSearch(query) {
  if (!query.trim()) {
    const trending = await searchGifs('trending', 20);
    renderGifResults(trending);
    return;
  }
  const results = await searchGifs(query, 20);
  renderGifResults(results);
}

function confirmGifSelection() {
  if (!selectedGifUrl) {
    alert('Please select a GIF first');
    return;
  }
  
  // Find the current comment input and add the GIF
  if (currentGifPostId) {
    const input = document.getElementById('comment-input-' + currentGifPostId);
    if (input) {
      input.value += `[GIF]${selectedGifUrl}[/GIF]`;
    }
  }
  
  closeModal('modal-gif-picker');
  selectedGifUrl = null;
}

function openGifPickerForComment(postId) {
  currentGifPostId = postId;
  openGifPicker();
}

// Initialize trending GIFs when modal opens
const originalOpenGifPicker = openGifPicker;
openGifPicker = function() {
  originalOpenGifPicker();
  // Load trending GIFs
  searchGifs('trending', 20).then(renderGifResults);
};
