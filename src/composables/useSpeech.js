/**
 * useSpeech — Web Speech API (SpeechRecognition)
 * ฟรี 100% ทำงานใน browser สมัยใหม่ รองรับภาษาไทย
 *
 * วิธีใช้:
 *   const { isListening, transcript, isSupported, startListening, stopListening } = useSpeech()
 *
 *   // ผูก textarea
 *   startListening((text) => { form.notes += text })
 */

import { ref } from 'vue'

export function useSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const isSupported = !!SpeechRecognition

  const isListening  = ref(false)
  const transcript   = ref('')
  const errorMsg     = ref('')

  let recognition = null

  function startListening(onResult, lang = 'th-TH') {
    if (!isSupported) {
      errorMsg.value = 'Browser ไม่รองรับ Speech Recognition'
      return
    }
    if (isListening.value) {
      stopListening()
      return
    }

    recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onstart = () => {
      isListening.value = true
      errorMsg.value = ''
    }

    recognition.onresult = (event) => {
      const result = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('')
      transcript.value = result
      if (onResult) onResult(result)
    }

    recognition.onerror = (event) => {
      console.error('[Speech] error:', event.error)
      if (event.error === 'not-allowed') {
        errorMsg.value = 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน'
      } else if (event.error === 'no-speech') {
        errorMsg.value = 'ไม่ได้ยินเสียง — ลองพูดใหม่อีกครั้ง'
      } else {
        errorMsg.value = `เกิดข้อผิดพลาด: ${event.error}`
      }
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
    }

    recognition.start()
  }

  function stopListening() {
    if (recognition) {
      recognition.stop()
      recognition = null
    }
    isListening.value = false
  }

  return { isListening, transcript, errorMsg, isSupported, startListening, stopListening }
}
