let animationFrameId = null;
let noiseAnalysisInterval = null;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id;
  chrome.scripting.executeScript({
    target: { tabId },
    function: initializeAudioElements
  }, (results) => {
    const audioElements = results[0].result;
    const controlsDiv = document.getElementById('controls');
    const canvas = document.getElementById('spectrumCanvas');
    const ctx = canvas.getContext('2d');
    const showSpectrumBtn = document.getElementById('showSpectrumBtn');
    let selectedIndex = 0;

    chrome.storage.local.get(['audioSettings'], (data) => {
      const audioSettings = data.audioSettings || {};

      audioElements.forEach((src, index) => {
        const div = document.createElement('div');
        div.className = 'control';
        div.innerHTML = `Audio ${index + 1} (${src.slice(0, 20)}...): `;

        const savedSettings = audioSettings[src] || { volume: 1, compressionThreshold: -24, highpassFrequency: 0, highpassQ: 1 };
        const initialVolume = savedSettings.volume;
        const initialThreshold = savedSettings.compressionThreshold;
        const initialHighpassFrequency = savedSettings.highpassFrequency;
        const initialHighpassQ = savedSettings.highpassQ;

        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = 0;
        volumeSlider.max = 1;
        volumeSlider.step = 0.01;
        volumeSlider.value = initialVolume;

        const volumeDisplay = document.createElement('span');
        volumeDisplay.textContent = initialVolume.toFixed(2);
        volumeDisplay.style.marginLeft = '5px';

        const volumeInput = document.createElement('input');
        volumeInput.type = 'number';
        volumeInput.min = 0;
        volumeInput.max = 1;
        volumeInput.step = 0.01;
        volumeInput.value = initialVolume;
        volumeInput.style.marginLeft = '5px';

        const thresholdSlider = document.createElement('input');
        thresholdSlider.type = 'range';
        thresholdSlider.min = -100;
        thresholdSlider.max = 0;
        thresholdSlider.step = 1;
        thresholdSlider.value = initialThreshold;

        const thresholdDisplay = document.createElement('span');
        thresholdDisplay.textContent = `${initialThreshold} dB`;
        thresholdDisplay.style.marginLeft = '5px';

        const highpassSlider = document.createElement('input');
        highpassSlider.type = 'range';
        highpassSlider.min = 0;
        highpassSlider.max = 2000;
        highpassSlider.step = 10;
        highpassSlider.value = initialHighpassFrequency;

        const highpassDisplay = document.createElement('span');
        highpassDisplay.textContent = `${initialHighpassFrequency} Hz`;
        highpassDisplay.style.marginLeft = '5px';

        const highpassQSlider = document.createElement('input');
        highpassQSlider.type = 'range';
        highpassQSlider.min = 0.1;
        highpassQSlider.max = 10;
        highpassQSlider.step = 0.1;
        highpassQSlider.value = initialHighpassQ;

        const highpassQDisplay = document.createElement('span');
        highpassQDisplay.textContent = `${initialHighpassQ.toFixed(1)}`;
        highpassQDisplay.style.marginLeft = '5px';

        volumeSlider.oninput = () => {
          const volume = parseFloat(volumeSlider.value);
          volumeInput.value = volume;
          volumeDisplay.textContent = volume.toFixed(2);
          chrome.scripting.executeScript({
            target: { tabId },
            function: setVolume,
            args: [index, volume, src]
          });
          audioSettings[src] = { ...audioSettings[src], volume };
          chrome.storage.local.set({ audioSettings });
        };

        volumeInput.oninput = () => {
          let volume = parseFloat(volumeInput.value);
          if (isNaN(volume) || volume < 0) volume = 0;
          if (volume > 1) volume = 1;
          volumeSlider.value = volume;
          volumeDisplay.textContent = volume.toFixed(2);
          chrome.scripting.executeScript({
            target: { tabId },
            function: setVolume,
            args: [index, volume, src]
          });
          audioSettings[src] = { ...audioSettings[src], volume };
          chrome.storage.local.set({ audioSettings });
        };

        thresholdSlider.oninput = () => {
          const threshold = parseFloat(thresholdSlider.value);
          thresholdDisplay.textContent = `${threshold} dB`;
          chrome.scripting.executeScript({
            target: { tabId },
            function: setCompression,
            args: [index, threshold, src]
          });
          audioSettings[src] = { ...audioSettings[src], compressionThreshold: threshold };
          chrome.storage.local.set({ audioSettings });
        };

        highpassSlider.oninput = () => {
          const frequency = parseFloat(highpassSlider.value);
          highpassDisplay.textContent = `${frequency} Hz`;
          chrome.scripting.executeScript({
            target: { tabId },
            function: setHighpassFilter,
            args: [index, frequency, src]
          });
          audioSettings[src] = { ...audioSettings[src], highpassFrequency: frequency };
          chrome.storage.local.set({ audioSettings });
        };

        highpassQSlider.oninput = () => {
          const qValue = parseFloat(highpassQSlider.value);
          highpassQDisplay.textContent = `${qValue.toFixed(1)}`;
          chrome.scripting.executeScript({
            target: { tabId },
            function: setHighpassQ,
            args: [index, qValue, src]
          });
          audioSettings[src] = { ...audioSettings[src], highpassQ: qValue };
          chrome.storage.local.set({ audioSettings });
        };

        div.appendChild(volumeSlider);
        div.appendChild(volumeDisplay);
        div.appendChild(volumeInput);
        div.appendChild(document.createTextNode('Noise Threshold: '));
        div.appendChild(thresholdSlider);
        div.appendChild(thresholdDisplay);
        div.appendChild(document.createTextNode('Highpass Filter: '));
        div.appendChild(highpassSlider);
        div.appendChild(highpassDisplay);
        div.appendChild(document.createTextNode('Q Value: '));
        div.appendChild(highpassQSlider);
        div.appendChild(highpassQDisplay);
        controlsDiv.appendChild(div);
      });

      showSpectrumBtn.onclick = () => {
        canvas.style.display = canvas.style.display === 'none' ? 'block' : 'none';
        if (canvas.style.display === 'block') {
          selectedIndex = 0;
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          if (noiseAnalysisInterval) clearInterval(noiseAnalysisInterval);
          chrome.scripting.executeScript({
            target: { tabId },
            function: startSpectrum,
            args: [selectedIndex]
          }, () => {
            setTimeout(() => {
              drawSpectrum(tabId, selectedIndex, ctx, canvas);
              analyzeNoise(tabId, selectedIndex);
            }, 100);
          });
        } else {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          if (noiseAnalysisInterval) clearInterval(noiseAnalysisInterval);
          chrome.scripting.executeScript({
            target: { tabId },
            function: stopSpectrum,
            args: [selectedIndex]
          });
        }
      };
    });
  });
});

window.addEventListener('unload', () => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (noiseAnalysisInterval) clearInterval(noiseAnalysisInterval);
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: stopAllAudioContexts
    });
  });
});

function initializeAudioElements() {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const audioDataMap = window.audioDataMap || {};
  audioElements.forEach((el, index) => {
    const src = el.src || `audio_${index}`;
    if (!audioDataMap[src]) {
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const source = context.createMediaElementSource(el);
        const gainNode = context.createGain();
        const compressorNode = context.createDynamicsCompressor();
        compressorNode.threshold.setValueAtTime(-24, context.currentTime);
        compressorNode.knee.setValueAtTime(30, context.currentTime);
        compressorNode.ratio.setValueAtTime(12, context.currentTime);
        compressorNode.attack.setValueAtTime(0.003, context.currentTime);
        compressorNode.release.setValueAtTime(0.25, context.currentTime);
        const highpassFilter = context.createBiquadFilter();
        highpassFilter.type = 'highpass';
        highpassFilter.frequency.setValueAtTime(0, context.currentTime);
        highpassFilter.Q.setValueAtTime(1, context.currentTime);
        const notchFilter = context.createBiquadFilter();
        notchFilter.type = 'notch';
        notchFilter.frequency.setValueAtTime(0, context.currentTime);
        notchFilter.Q.setValueAtTime(1, context.currentTime);
        const analyserNode = context.createAnalyser();
        analyserNode.fftSize = 2048;
        source.connect(highpassFilter).connect(compressorNode).connect(notchFilter).connect(analyserNode).connect(gainNode).connect(context.destination);
        audioDataMap[src] = { context, source, gainNode, compressorNode, highpassFilter, notchFilter, analyserNode };
        el.dataset.audioInitialized = true;
      } catch (e) {
        console.error('Failed to initialize audio context for element:', e);
      }
    }
  });
  window.audioDataMap = audioDataMap;
  chrome.storage.local.get(['audioSettings'], (data) => {
    const audioSettings = data.audioSettings || {};
    audioElements.forEach((el, index) => {
      const src = el.src || `audio_${index}`;
      const settings = audioSettings[src] || {};
      if (settings.volume) {
        setVolume(index, settings.volume, src);
      }
      if (settings.compressionThreshold) {
        setCompression(index, settings.compressionThreshold, src);
      }
      if (settings.highpassFrequency) {
        setHighpassFilter(index, settings.highpassFrequency, src);
      }
      if (settings.highpassQ) {
        setHighpassQ(index, settings.highpassQ, src);
      }
    });
  });
  return audioElements.map(el => el.src || 'No source');
}

function stopAllAudioContexts() {
  const audioDataMap = window.audioDataMap || {};
  Object.values(audioDataMap).forEach(audioData => {
    if (audioData.context && audioData.context.state === 'running') {
      audioData.context.suspend();
    }
  });
}

function setVolume(index, volume, src) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    try {
      el.volume = volume;
      const audioData = window.audioDataMap[src] || window.audioDataMap[`audio_${index}`];
      if (audioData && audioData.gainNode) {
        audioData.gainNode.gain.setValueAtTime(volume, audioData.context.currentTime);
      }
    } catch (e) {
      console.error('Error setting volume:', e);
    }
  }
}

function setCompression(index, threshold, src) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    try {
      const audioData = window.audioDataMap[src] || window.audioDataMap[`audio_${index}`];
      if (audioData && audioData.compressorNode) {
        audioData.compressorNode.threshold.setValueAtTime(threshold, audioData.context.currentTime);
      }
    } catch (e) {
      console.error('Error setting compression:', e);
    }
  }
}

function setHighpassFilter(index, frequency, src) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    try {
      const audioData = window.audioDataMap[src] || window.audioDataMap[`audio_${index}`];
      if (audioData && audioData.highpassFilter) {
        audioData.highpassFilter.frequency.setValueAtTime(frequency, audioData.context.currentTime);
        console.log(`Highpass filter set to ${frequency} Hz for ${src || `audio_${index}`}`);
      }
    } catch (e) {
      console.error('Error setting highpass filter:', e);
    }
  }
}

function setHighpassQ(index, qValue, src) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    try {
      const audioData = window.audioDataMap[src] || window.audioDataMap[`audio_${index}`];
      if (audioData && audioData.highpassFilter) {
        audioData.highpassFilter.Q.setValueAtTime(qValue, audioData.context.currentTime);
        console.log(`Highpass Q value set to ${qValue} for ${src || `audio_${index}`}`);
      }
    } catch (e) {
      console.error('Error setting highpass Q:', e);
    }
  }
}

function setNotchFilter(index, frequency, src) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    try {
      const audioData = window.audioDataMap[src] || window.audioDataMap[`audio_${index}`];
      if (audioData && audioData.notchFilter) {
        audioData.notchFilter.frequency.setValueAtTime(frequency, audioData.context.currentTime);
        audioData.notchFilter.Q.setValueAtTime(10, audioData.context.currentTime);
        console.log(`Notch filter set to ${frequency} Hz for ${src || `audio_${index}`}`);
      }
    } catch (e) {
      console.error('Error setting notch filter:', e);
    }
  }
}

function startSpectrum(index) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    const src = el.src || `audio_${index}`;
    const audioData = window.audioDataMap[src];
    if (audioData && audioData.context) {
      if (audioData.context.state === 'suspended') {
        audioData.context.resume().then(() => {
          console.log(`AudioContext resumed for ${src}`);
        }).catch(err => {
          console.error('Error resuming AudioContext:', err);
        });
      } else if (audioData.context.state === 'closed') {
        console.log('AudioContext closed, reinitializing...');
        delete window.audioDataMap[src];
        el.dataset.audioInitialized = false;
        initializeAudioElements();
      }
    }
  }
}

function stopSpectrum(index) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    const src = el.src || `audio_${index}`;
    const audioData = window.audioDataMap[src];
    if (audioData && audioData.context && audioData.context.state === 'running') {
      audioData.context.suspend().then(() => {
        console.log(`AudioContext suspended for ${src}`);
      }).catch(err => {
        console.error('Error suspending AudioContext:', err);
      });
    }
  }
}

function drawSpectrum(tabId, index, ctx, canvas) {
  chrome.scripting.executeScript({
    target: { tabId },
    function: getSpectrumData,
    args: [index]
  }, (results) => {
    const data = results[0].result;
    if (data) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgb(200, 200, 200)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / data.length) * 2.5;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const barHeight = (data[i] / 255) * canvas.height;
        ctx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      animationFrameId = requestAnimationFrame(() => drawSpectrum(tabId, index, ctx, canvas));
    }
  });
}

function getSpectrumData(index) {
  const audioElements = Array.from(document.querySelectorAll('audio, video'));
  const el = audioElements[index];
  if (el) {
    try {
      const src = el.src || `audio_${index}`;
      const audioData = window.audioDataMap[src];
      if (audioData && audioData.analyserNode) {
        const bufferLength = audioData.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        audioData.analyserNode.getByteFrequencyData(dataArray);
        return Array.from(dataArray);
      }
    } catch (e) {
      console.error('Error getting spectrum data:', e);
    }
  }
  return null;
}

function analyzeNoise(tabId, index) {
  let spectra = [];
  const sampleRate = 44100;
  const fftSize = 2048;
  const frequencyBinCount = fftSize / 2;
  const frequencyResolution = sampleRate / fftSize;

  noiseAnalysisInterval = setInterval(() => {
    chrome.scripting.executeScript({
      target: { tabId },
      function: getSpectrumData,
      args: [index]
    }, (results) => {
      const data = results[0].result;
      if (data) {
        spectra.push(data);
        if (spectra.length >= 100) {
          const frequencyPresence = new Array(data.length).fill(0);
          for (let i = 0; i < data.length; i++) {
            let presenceCount = 0;
            for (let s = 0; s < spectra.length; s++) {
              if (spectra[s][i] > 10) { // Порог для обнаружения пика
                presenceCount++;
              }
            }
            if (presenceCount / spectra.length >= 0.8) { // 80% повторяемости
              frequencyPresence[i] = 1;
            }
          }

          const noiseFrequencies = [];
          for (let i = 0; i < frequencyPresence.length; i++) {
            if (frequencyPresence[i]) {
              const frequency = i * frequencyResolution;
              noiseFrequencies.push(frequency);
            }
          }

          if (noiseFrequencies.length > 0) {
            console.log(`Detected repetitive noise frequencies: ${noiseFrequencies.join(', ')} Hz`);
            noiseFrequencies.forEach(freq => {
              chrome.scripting.executeScript({
                target: { tabId },
                function: setNotchFilter,
                args: [index, freq, audioElements[index].src]
              });
            });
          }

          spectra = [];
        }
      }
    });
  }, 100);
}