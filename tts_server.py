from flask import Flask, request, jsonify, send_file, after_this_request, Response
from flask_cors import CORS
import os
import tempfile
import traceback
import math
import struct
import wave
import sys

# Place your Groq API key here (in-code embed requested). Replace the placeholder with the real key.
GROQ_API_KEY = "gsk_YOUR_REAL_GROQ_KEY_HERE"

try:
    from groq import Groq
except Exception:
    Groq = None

app = Flask(__name__)
CORS(app)

@app.route('/api/tts', methods=['POST', 'OPTIONS'])
def api_tts():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json(force=True)
    text = (data or {}).get('text', '')
    voice = (data or {}).get('voice', 'Aaliyah-PlayAI')

    if not text:
        return jsonify({'error': 'no text provided'}), 400

    temp_fd, temp_path = tempfile.mkstemp(suffix='.wav')
    os.close(temp_fd)

    @after_this_request
    def cleanup(response: Response):
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass
        return response

    try:
        api_key = "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"
        if api_key and Groq is not None:
            client = Groq(api_key=api_key)
            response = client.audio.speech.create(
                model="playai-tts",
                voice=voice,
                response_format="wav",
                input=text,
            )
            # Many SDKs provide stream_to_file helper; use if available
            if hasattr(response, 'stream_to_file'):
                response.stream_to_file(temp_path)
            else:
                # fallback: write bytes if property exists
                audio_bytes = getattr(response, 'bytes', None)
                if audio_bytes:
                    with open(temp_path, 'wb') as f:
                        f.write(audio_bytes)
                else:
                    # cannot get audio: return error
                    return jsonify({'error': 'TTS generation failed'}), 500
            return send_file(temp_path, as_attachment=True, download_name='speech.wav', mimetype='audio/wav')
        else:
            duration = min(8, max(1, len(text) // 20))
            sample_rate = 16000
            num_samples = duration * sample_rate
            freq = 440.0
            amplitude = 32767 * 0.3
            with wave.open(temp_path, 'w') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                for i in range(num_samples):
                    val = int(amplitude * math.sin(2 * math.pi * freq * (i / sample_rate)))
                    wf.writeframes(struct.pack('<h', val))
            return send_file(temp_path, as_attachment=True, download_name='speech_simulated.wav', mimetype='audio/wav')
    except Exception as e:
        tb = traceback.format_exc()
        print(tb)
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'TTS server running'})

if __name__ == '__main__':
    print("Starting TTS Server...")
    print(f"Python executable: {sys.executable}")
    app.run(host='0.0.0.0', port=5001, debug=False)
