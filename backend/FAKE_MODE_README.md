# Fake Evaluation Mode

Chế độ fake evaluation được tạo để test các tính năng mới của hệ thống mà không cần Docker Engine translate thật.

## Cách sử dụng

### 1. Bật chế độ fake mode
```bash
cd backend
python toggle_fake_mode.py on
```

### 2. Restart backend server
Sau khi bật fake mode, bạn cần restart backend server:
```bash
# Dừng server hiện tại (Ctrl+C)
# Rồi chạy lại:
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Test các tính năng
Bây giờ bạn có thể test:
- **Evaluation Job**: Chạy evaluation sẽ tạo file output fake với nội dung "นี่คือข้อความทดสอบภาษาไทย"
- **Download Output**: Tải về file kết quả translation
- **View Comparison**: Xem so sánh side-by-side giữa output và reference
- **Direct Translation**: Translate text trực tiếp

### 4. Tắt chế độ fake mode (khi đã setup Docker)
```bash
python toggle_fake_mode.py off
# Rồi restart server
```

## Fake Data Details

### Translation Output
- Mỗi dòng trong file output sẽ là: `นี่คือข้อความทดสอบภาษาไทย`
- Số dòng sẽ khớp với số dòng trong source file

### Scores
- **BLEU Score**: Random từ 15.0 đến 35.0 (realistic range cho MT)
- **COMET Score**: Random từ 0.6 đến 0.85 (realistic range cho COMET)

### Processing Time
- Evaluation: 2 giây fake processing
- Translation: 1 giây fake processing

## Kiểm tra trạng thái
```bash
python toggle_fake_mode.py status
```

## Log Messages
Khi fake mode hoạt động, bạn sẽ thấy log messages có prefix `[FAKE MODE]`:
```
[FAKE MODE] Creating fake translation output: /path/to/output.txt
[FAKE MODE] Generated fake BLEU: 23.45, COMET: 0.7234
[FAKE MODE ENABLED] Using fake evaluation for job_id: 123
```

## Lưu ý quan trọng

⚠️ **Nhớ tắt fake mode** khi đã setup Docker Engine translate thật:
```bash
python toggle_fake_mode.py off
```

⚠️ **Luôn restart server** sau khi thay đổi fake mode setting.

🔍 **Chỉ dùng cho testing** - không sử dụng trong production với data thật. 