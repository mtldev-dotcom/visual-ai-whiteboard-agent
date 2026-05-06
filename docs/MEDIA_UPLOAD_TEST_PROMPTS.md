# Media Upload & Embed — Assistant Test Prompts

Run these prompts in the chat panel to verify media features work end-to-end.
Before starting: upload a test image, video, and audio file so you have real `/uploads/...` URLs to reference.

---

## 1. Image on canvas (via AI)

**Setup:** Upload a PNG via the toolbar Upload button or by dragging it onto the canvas.
Copy the URL from the canvas item's `src` (inspect the item or check the network tab).

**Prompt:**
```
Add an image to this board using this URL: /uploads/<workspaceId>/test-image.png — title it "Team photo"
```

**Expected:** AI calls `add_canvas_item` with `type: "image"`, `content.src` set to the URL, `content.title: "Team photo"`. Image card appears on canvas showing the photo.

---

## 2. Video on canvas (via AI)

**Setup:** Upload an MP4 file first.

**Prompt:**
```
Add a video called "Product demo" to the board using the file at /uploads/<workspaceId>/demo.mp4
```

**Expected:** AI calls `add_canvas_item` with `type: "video"`, card appears with native video controls. Resize the card — video should fill the new bounds.

---

## 3. Audio on canvas (via AI)

**Setup:** Upload an MP3 file first.

**Prompt:**
```
Place an audio player on the board for the file /uploads/<workspaceId>/podcast.mp3, title "Episode 42"
```

**Expected:** AI creates `type: "audio"` card with waveform decoration, title, and audio controls. Clicking the scrubber should not drag the card.

---

## 4. YouTube embed via AI tool call

**Prompt:**
```
Embed this YouTube video on the canvas: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Expected:** AI converts the watch URL to `https://www.youtube.com/embed/dQw4w9WgXcQ` and creates `type: "iframe_embed"` with `content.src` set to the embed URL. YouTube player loads inside the canvas card. No blank/broken player.

---

## 5. YouTube embed via chat banner (UI shortcut)

**Steps:**
1. In the chat input, paste: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. A blue banner "YouTube detected — embed on canvas?" should appear above the input.
3. Click **Embed**.

**Expected:** Banner dismisses, draft clears, and an `iframe_embed` card appears on the canvas at position (200, 200) with the YouTube player loaded.

---

## 6. YouTube short URL

**Prompt:**
```
Add this video to the board: https://youtu.be/dQw4w9WgXcQ
```

**Expected:** AI extracts the 11-character video ID and constructs the correct embed URL. Same result as prompt 4.

---

## 7. Multiple media types in one turn

**Prompt:**
```
Add three items to the board: a sticky note saying "Media demo", a YouTube embed for https://www.youtube.com/watch?v=dQw4w9WgXcQ, and an image from /uploads/<workspaceId>/test.jpg titled "Screenshot"
```

**Expected:** AI makes three sequential `add_canvas_item` calls — one `sticky_note`, one `iframe_embed`, one `image`. All three appear on the canvas.

---

## 8. Update a media item's title

**Setup:** Have an image or video item on the board. Get its item ID from the canvas (or ask the AI to list items first).

**Prompt:**
```
List all items on this board, then update the title of the image item to "Updated caption"
```

**Expected:** AI calls `list_canvas_items` first, identifies the image item, then calls `update_canvas_item` with updated `content.title`. The caption bar below the image updates.

---

## 9. File attach via chat paperclip

**Steps:**
1. Click the paperclip icon (📎) next to the send button in the chat input.
2. Select a JPEG from your computer.
3. The draft should now contain `[filename](/uploads/.../file.jpg)`.
4. Send the message: "Add this image to the canvas: [filename](/uploads/.../file.jpg)"

**Expected:** File uploads on click (spinner appears briefly). URL is inserted into draft as markdown link. After sending, AI creates an `image` canvas item using the URL.

---

## 10. Drag-and-drop image onto canvas

**Steps:**
1. Open a board.
2. Drag a JPEG from Windows Explorer directly onto the canvas surface (not onto the toolbar).

**Expected:** "Uploading filename…" badge appears briefly at the bottom center. An `image` card materialises at the drop position. The full image is visible in the card (not the old tiny 64px version).

---

## 11. Drag multiple files

**Steps:**
1. Select 3 image files in Explorer (Ctrl+click).
2. Drag them all onto the canvas.

**Expected:** All 3 upload and appear as separate `image` cards with slight offsets. Maximum 5 files are processed; additional files are silently ignored.

---

## 12. Rejected file type

**Steps:**
1. Try to drop a `.pdf` or `.docx` onto the canvas.

**Expected:** No canvas item is created. No error is shown (the drop is silently ignored by the MIME check). The upload API returns 415 if tested directly.

---

## 13. Generic iframe embed (non-YouTube)

**Prompt:**
```
Embed the following iframe on the board: https://www.google.com/maps/embed?pb=!1m18!1m12... — title it "Office location"
```

**Expected:** AI creates `type: "iframe_embed"` with the provided URL as `content.src`. Card renders an iframe with the map. (Note: some sites block embedding via `X-Frame-Options`.)

---

## 14. Summarize board with media items

**Prompt (after adding several media items):**
```
Summarize what's on this board
```

**Expected:** AI calls `list_canvas_items`, reads item types and titles, and produces a summary that mentions the image, video, audio, and embed items by name.

---

## 15. Delete a media item

**Prompt:**
```
Delete the YouTube embed from the board
```

**Expected:** AI calls `list_canvas_items` to find the `iframe_embed` item, then calls `delete_canvas_item` with `confirmed: true`. The embed card disappears from the canvas.
