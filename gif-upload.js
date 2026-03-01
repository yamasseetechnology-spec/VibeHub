// GIF upload and embed module (no Tenor)
let _pendingGifUrl = null

async function uploadGifFile(file) {
  if (!file) throw new Error('No file provided')
  const fileName = `${Date.now()}_${file.name}`
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not ready')
  const { data, error } = await sb.storage.from('gif-comments').upload(fileName, file, {
    contentType: 'image/gif'
  })
  if (error) throw error
  const { data: urlData } = sb.storage.from('gif-comments').getPublicUrl(fileName)
  return urlData.publicUrl
}

async function handleGifFile(input) {
  const file = input.files?.[0]
  if (!file) return
  try {
    if (file.type && !file.type.startsWith('image/gif')) {
      alert('Please choose a GIF file')
      return
    }
    const url = await uploadGifFile(file)
    _pendingGifUrl = url
    // warm UI preview if needed
    const preview = document.getElementById('gif-preview')
    if (preview) preview.src = url
  } catch (e) {
    console.error('GIF upload failed', e)
  }
}

async function attachPendingGifToPost() {
  const text = (document.getElementById('post-composer-input')?.value || '').trim()
  let gifUrl = _pendingGifUrl
  if (!gifUrl) return null
  // Post a GIF comment leading the post
  try {
    await postCommentForGif(text, gifUrl)
    _pendingGifUrl = null
  } catch (e) {
    console.error('Failed to attach GIF to post', e)
  }
  return gifUrl
}

async function postCommentForGif(text, gifUrl) {
  // Directly insert a GIF-bearing comment as a prefix if needed; adjust to your data model
  // This assumes a comments table with gif_url field exists
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not ready')
  const { data, error } = await sb.from('comments').insert([{ content: text, gif_url: gifUrl }])
  if (error) throw error
  return data
}

// Expose a small API surface if needed by index.html
window.GIFUploader = {
  handleGifFile,
  attachPendingGifToPost
}
