import { Groq } from 'groq-sdk'

export const handleChat = async (message, history = []) => {
  if (!process.env.GROQ_API_KEY) {
    return 'Xin lỗi, chatbot hiện đang tạm bảo trì do thiếu cấu hình API.'
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const systemPrompt = `Bạn là một trợ lý ảo thông minh của phòng thí nghiệm IC Design Lab (Integrated Circuit Design Laboratory) tại Đại học Bách khoa Hà Nội (HUST).
Nhiệm vụ của bạn là giải đáp các thắc mắc về phòng lab (nghiên cứu, tuyển dụng, tài liệu học tập) và kiến thức cơ bản về thiết kế vi mạch (IC Design, VLSI, FPGA, ASIC, v.v.).
Giọng điệu của bạn cần lịch sự, chuyên nghiệp, súc tích và thân thiện. Không đưa ra thông tin bịa đặt. Nếu không chắc chắn, hãy hướng dẫn họ liên hệ qua email thang.nguyenvu@hust.edu.vn.`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: message }
  ]

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 500,
    })

    return completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể xử lý yêu cầu lúc này.'
  } catch (error) {
    console.error('Chatbot Error:', error)
    return 'Đã xảy ra lỗi khi kết nối với máy chủ AI. Vui lòng thử lại sau.'
  }
}
