TRO LY HOC VU CNTT — GIAO DIEN CHAT TICH HOP COZE API

CAC FILE CHINH
- index.html: giao dien chat tren trinh duyet/dien thoai.
- server.js: may chu API, giu token Coze va gui cau hoi den Coze.
- .env.example: mau cau hinh de chay tren may ca nhan.
- package.json: lenh npm start cho hosting Node.js.
- render.yaml: cau hinh Blueprint tham khao cho Render.

QUAN TRONG
Khong the chi gui file index.html neu muon chat truc tiep voi Coze API. Can host ca index.html va server.js tren cung mot dich vu web. Token phai duoc dat trong Environment Variables cua hosting, tuyet doi khong dua token vao HTML/JavaScript trinh duyet va khong upload file .env len GitHub.

CHAY TREN MAY CA NHAN
1. Cai Node.js 18 tro len (khuyen dung Node.js 22 LTS) va VS Code.
2. Giai nen ZIP va mo thu muc nay trong VS Code.
3. Copy .env.example thanh file .env.
4. Trong .env, thay gia tri COZE_API_TOKEN bang Personal Access Token cua ban. Kiem tra COZE_BOT_ID dung voi bot duoc phep goi API; gia tri san trong file lay tu link Store va co the can thay bang Bot ID trong Workspace/Develop.
5. Mo Terminal trong VS Code, chay: npm start
6. Mo http://localhost:3000
7. Kiem tra http://localhost:3000/api/health. Neu ok true, configured true, may chu da doc cau hinh; viec nay chua dam bao Coze API chap nhan token/Bot ID.

CHIA SE CHO CA NHOM QUA INTERNET (Render Web Service)
A. Dua MA NGUON len GitHub an toan
1. Tao repository moi tren https://github.com/ (vi du ten tro-ly-hoc-vu-cntt).
2. Tai len cac file: index.html, server.js, package.json, .node-version, render.yaml, README.txt, .gitignore.
3. KHONG tai len file .env. Neu file .env da duoc commit len GitHub, go bo khoi repository va tao token Coze moi ngay lap tuc.
4. Co the de repository Private va ket noi tai khoan GitHub voi Render.

B. Tao Web Service tren Render
1. Mo https://render.com/ va dang nhap.
2. Chon New + > Web Service, ket noi GitHub va chon repository vua tao.
3. Dat cac thong so:
   - Runtime/Language: Node
   - Build Command: npm install
   - Start Command: npm start
   - Plan: Free (neu chi demo; free service co the ngu sau mot thoi gian khong hoat dong).
4. Trong Environment/Environment Variables, them:
   - COZE_API_TOKEN = Personal Access Token (giu bi mat)
   - COZE_BOT_ID = Bot ID dung cho Coze API
   - COZE_API_BASE = https://api.coze.com (neu tai khoan dung khu vuc khac, theo tai lieu Coze)
5. Bam Deploy/Create Web Service va cho qua trinh build/deploy hoan tat.
6. Render se cap mot URL dang https://ten-dich-vu.onrender.com. Mo URL nay, khong mo file index.html truc tiep.
7. Thu https://ten-dich-vu.onrender.com/api/health. Sau do thu gui cau hoi tu giao dien.
8. Gui URL https://...onrender.com cho cac ban trong nhom.

NEU DUNG RENDER BLUEPRINT
Repository co file render.yaml de tham khao cau hinh. Neu chon deploy bang Blueprint, Render co the tao service tu file nay; van phai nhap gia tri COZE_API_TOKEN bi mat khi duoc yeu cau. Neu chua quen Blueprint, tao Web Service bang Dashboard theo huong dan tren la de theo doi hon.

NEU GAP LOI
- Failed to fetch khi mo trang cong khai: kiem tra dang mo URL Render (https://...), khong phai file://, localhost hoac Live Server 5500.
- HTTP 401/403: token sai/het han/khong du quyen.
- HTTP 404 hoac khong tim thay bot: kiem tra Bot ID va quyen cua token; Store ID khong nhat thiet la Bot ID su dung duoc qua API.
- /api/health hien configured=true chi xac nhan bien moi truong co gia tri; khong xac nhan API Coze da cho phep goi bot.
- Neu thay doi Environment Variables tren Render, luu va redeploy/restart dich vu theo tuy chon tren Dashboard.

LUU Y KHI CHIA SE
- Day la ban demo hoc tap; neu cho nhieu sinh vien dung that, can bo sung gioi han request, bao ve endpoint, theo doi chi phi va kiem soat truy cap.
- Render Free co the sleep khi khong co request; lan truy cap dau sau thoi gian ngu co the cham.
- Cac ban trong nhom chi can URL cong khai cua website, khong can nhan file .env hay token.
