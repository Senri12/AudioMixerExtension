# Audio Mixer Extension with Noise Cancellation

A Chrome extension that enhances your audio experience by mixing multiple audio sources and applying noise cancellation to repetitive frequencies. Perfect for videos with background noise!

## Features
- Mix multiple audio sources (e.g., `<audio>` or `<video>` tags on a webpage).
- Real-time spectrum visualization.
- Noise cancellation targeting repetitive frequencies (e.g., hums or steady background noise).
- Adjustable volume, highpass filter, and compression settings.
- Persistent settings across sessions.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Senri12/AudioMixerExtension
   ```
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" in the top right.
4. Click "Load unpacked" and select the cloned repository folder.
5. The extension will appear in your Chrome toolbar.

## Usage
1. Navigate to a webpage with audio or video content (e.g., YouTube).
2. Click the extension icon to open the popup.
3. Adjust the volume, noise threshold, highpass filter, and Q value as needed.
4. Click "Show Spectrum" to visualize the audio frequencies and activate noise cancellation.
5. The extension will automatically detect and suppress repetitive noise frequencies.

## Requirements
- Google Chrome browser (latest version recommended).
- Basic understanding of audio processing concepts (optional).

## How It Works
The extension uses the Web Audio API to:
- Analyze audio frequencies in real-time.
- Identify repetitive noise frequencies (present in >80% of samples over 10 seconds).
- Apply notch filters to cancel out detected noise without affecting the main audio.

## Contributing
Feel free to submit issues or pull requests! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m "Add new feature"`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements
- Inspired by the need for better audio control in noisy video content.
- Built with help from the xAI community and Web Audio API documentation.

## Publishing to Chrome Web Store
To share this with a wider audience, consider publishing it to the Chrome Web Store:
1. Create a [Chrome Developer account](https://developer.chrome.com/docs/webstore/).
2. Prepare a manifest file (`manifest.json`) and icons (128x128px).
3. Zip the extension files (including this README).
4. Upload the zip file via the Chrome Web Store Developer Dashboard.
5. Set a price (free or paid) and submit for review.

Search keywords: audio mixer, noise cancellation, Chrome extension, audio filter, noise reduction, video enhancer.
