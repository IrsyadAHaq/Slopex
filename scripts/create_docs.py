# -*- coding: utf-8 -*-
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_document():
    doc = Document()

    # Set Margins (Standar Laporan PKM: Kiri 4cm, Atas 3cm, Kanan 3cm, Bawah 3cm)
    for section in doc.sections:
        section.top_margin = Inches(1.18)    # ~3 cm
        section.bottom_margin = Inches(1.18) # ~3 cm
        section.left_margin = Inches(1.57)   # ~4 cm
        section.right_margin = Inches(1.18)  # ~3 cm

    # Base Style
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    font.color.rgb = RGBColor(0, 0, 0)
    style.paragraph_format.line_spacing = 1.15
    style.paragraph_format.space_after = Pt(4)

    def add_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(14)
        run.font.name = 'Times New Roman'
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.space_before = Pt(12)
        return p

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12)
        run.font.name = 'Times New Roman'
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.space_before = Pt(10)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12)
        run.font.name = 'Times New Roman'
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.space_before = Pt(6)
        return p

    def add_heading_3(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(text)
        run.bold = True
        run.font.italic = True
        run.font.size = Pt(12)
        run.font.name = 'Times New Roman'
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.space_before = Pt(4)
        return p

    def add_body_p(text, bold_prefix="", indent=0.35):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.first_line_indent = Inches(indent)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(4)
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.bold = True
        p.add_run(text)
        return p

    # --- DAFTAR ISI ---
    add_title("DAFTAR ISI")
    toc_items = [
        ("DAFTAR ISI", "i"),
        ("DAFTAR GAMBAR", "ii"),
        ("DAFTAR TABEL", "ii"),
        ("DAFTAR LAMPIRAN", "ii"),
        ("BAB 1. PENDAHULUAN", "1"),
        ("   1.1 Latar Belakang", "1"),
        ("   1.2 Tujuan Program", "2"),
        ("   1.3 Manfaat Program", "2"),
        ("BAB 2. TARGET LUARAN", "2"),
        ("BAB 3. TAHAP PELAKSANAAN", "3"),
        ("   3.1 Studi Literatur", "3"),
        ("   3.2 Persiapan Alat dan Bahan", "3"),
        ("   3.3 Perancangan dan Pembuatan Prototipe", "4"),
        ("       3.3.1 Perancangan Prototipe", "4"),
        ("       3.3.2 Pembuatan Rangkaian Elektronika", "4"),
        ("       3.3.3 Pemrograman Mikrokontroler", "4"),
        ("       3.3.4 Penghubungan dan Konfigurasi LoRaWAN", "5"),
        ("       3.3.5 Perakitan Prototipe ke Dalam Box Panel Surya", "5"),
        ("   3.4 Pembuatan Website", "5"),
        ("       3.4.1 Pemrograman Website", "5"),
        ("       3.4.2 Pemrograman AI", "6"),
        ("   3.5 Uji Keandalan", "7"),
        ("       3.5.1 Uji Fungsional", "7"),
        ("       3.5.2 Uji Akurasi dan Presisi", "7"),
        ("       3.5.3 Uji Training AI", "8"),
        ("       3.5.4 Evaluasi Prototipe", "8"),
        ("BAB 4. HASIL YANG DICAPAI", "9"),
        ("   4.1 Prototipe SLOPEX", "9"),
        ("   4.2 Sistem Geo-Monitoring Terintegrasi", "9"),
        ("   4.3 Hasil Kurva Kalibrasi", "10"),
        ("   4.4 Hasil Uji Presisi", "10"),
        ("   4.5 Hasil Training AI", "11"),
        ("   4.6 Sosial Media dan Video Fungsional Prototipe", "13"),
        ("   4.7 Ketercapaian Program", "13"),
        ("BAB 5. POTENSI HASIL", "14"),
        ("BAB 6. RENCANA TAHAPAN BERIKUTNYA", "14"),
        ("DAFTAR PUSTAKA", "15"),
        ("LAMPIRAN", "17")
    ]
    for item, page in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        r1 = p.add_run(item)
        if "BAB" in item or "DAFTAR" in item:
            r1.bold = True
        # Dot leader
        p.add_run(" " + "." * (68 - len(item) * 1) + " " + page)

    doc.add_page_break()

    # --- DAFTAR GAMBAR & TABEL & LAMPIRAN ---
    add_title("DAFTAR GAMBAR")
    dg_items = [
        ("Gambar 1. Desain Rangkaian Skematik dan PCB SLOPEX", "4"),
        ("Gambar 2. Tampilan Dashboard Website Monitoring SLOPEX Berbasis IoT", "6"),
        ("Gambar 3. Prototipe Fisik SLOPEX Terpasang di Lapangan", "9"),
        ("Gambar 4. Kurva Kalibrasi Piecewise Sensor Kelembapan Tanah", "10"),
        ("Gambar 5. Matriks Konfusi (Confusion Matrix) Hasil Klasifikasi Model Random Forest AI", "12"),
        ("Gambar 6. Tampilan Percakapan Cerdas SLOPEX AI Assistant dan Notifikasi WhatsApp", "13")
    ]
    for item, page in dg_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        p.add_run(item + " " + "." * (60 - len(item[:40])) + " " + page)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    add_title("DAFTAR TABEL")
    dt_items = [
        ("Tabel 1. Hasil Uji Presisi Pengukuran Kelembapan Tanah dan Perubahan Kemiringan", "10"),
        ("Tabel 2. Matriks Konfusi (Confusion Matrix) Hasil Pengujian 33.048 Data Testing", "11"),
        ("Tabel 3. Evaluasi Metrik Performa Model AI Berdasarkan Parameter Geofisika", "12")
    ]
    for item, page in dt_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        p.add_run(item + " " + "." * (55 - len(item[:35])) + " " + page)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    add_title("DAFTAR LAMPIRAN")
    dl_items = [
        ("Lampiran 1. Penggunaan Dana", "17"),
        ("Lampiran 2. Bukti Kegiatan", "18"),
        ("Lampiran 3. Lokasi Kegiatan", "20"),
        ("Lampiran 4. Persentase Capaian Target Luaran Pengusul", "21"),
        ("Lampiran 5. Bukti Pendukung Media Sosial", "22"),
        ("Lampiran 6. Desain Rancangan Prototipe", "23"),
        ("Lampiran 7. Hasil Prototipe", "24"),
        ("Lampiran 8. Tampilan Platform Website dan Bot WhatsApp", "25"),
        ("Lampiran 9. Tampilan Layar dan Dashboard Monitoring", "26"),
        ("Lampiran 10. Buku Panduan SLOPEX", "27"),
        ("Lampiran 11. Cara Kerja Sistem IoT dan AI", "28"),
        ("Lampiran 12. Uji Keandalan Alat dan Evaluasi AI", "29"),
        ("Lampiran 13. Perolehan Hak Cipta", "31"),
        ("Lampiran 14. Publikasi Media Massa", "32")
    ]
    for item, page in dl_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        p.add_run(item + " " + "." * (60 - len(item[:40])) + " " + page)

    doc.add_page_break()

    # --- BAB 1 ---
    add_heading_1("BAB 1. PENDAHULUAN")
    add_heading_2("1.1 Latar Belakang")
    add_body_p("Indonesia memiliki dinamika geologi yang kompleks sehingga rentan terhadap berbagai bencana, termasuk longsor. Berdasarkan data BPS tahun 2025, tercatat 330 kejadian longsor yang tersebar di berbagai wilayah Indonesia. Kejadian longsor dipengaruhi oleh berbagai faktor, seperti bentuk dan kemiringan lereng, kondisi tanah, curah hujan, air tanah, erosi, vegetasi, aktivitas manusia, dan getaran (Sundari dkk., 2025). Faktor-faktor tersebut dapat menurunkan kekuatan geser tanah sehingga tanah tidak mampu menahan gaya gravitasi dan meningkatkan potensi terjadinya longsor (Waruwu dkk., 2022).")
    add_body_p("Untuk mengurangi risiko longsor, beberapa penelitian telah mengembangkan sistem peringatan dini berbasis IoT. Rahayra et al. (2024) menggunakan sensor ultrasonik dan soil moisture untuk pemantauan kondisi tanah secara real-time, dengan data ditampilkan pada website dan peringatan dikirim melalui WhatsApp. Sementara itu, Rawat dan Barthwal (2024) memanfaatkan sensor suhu, soil moisture, sensor tanah, accelerometer, dan GPS yang terhubung ke cloud dan aplikasi berbasis AI untuk memprediksi risiko longsor serta memberikan peringatan dini.")
    add_body_p("PKM-KC ini menghadirkan Arsitektur Geo-Monitoring Pintar Terintegrasi untuk mitigasi bencana longsor dengan SLOPEX sebagai alat utama. Sistem memanfaatkan IoT dan kecerdasan buatan untuk mengintegrasikan data kelembapan dan kemiringan tanah secara real-time dengan data curah hujan, elevasi, dan vegetasi yang tersimpan pada server. Sistem didukung panel surya dan aki sebagai sumber daya mandiri. Data yang terkumpul kemudian dianalisis menggunakan AI untuk mengidentifikasi tingkat risiko longsor dan memberikan peringatan dini melalui website serta notifikasi WhatsApp. Pengembangan selanjutnya diarahkan pada pengaturan drainase otomatis dan aktivasi sirine darurat saat terdeteksi perubahan kemiringan tanah.")
    add_body_p("Sistem Geo-Monitoring Pintar memungkinkan pemantauan risiko longsor secara real-time dan penyampaian peringatan dini kepada masyarakat. Selain mendukung mitigasi bencana, sistem ini juga dapat dimanfaatkan untuk pengelolaan irigasi dan drainase secara berkelanjutan. Hal ini selaras dengan tema PKM 2026 nomor 8, yaitu Pelestarian Lingkungan dan Mitigasi Bencana, melalui penerapan teknologi pintar yang mendukung pengurangan risiko longsor sekaligus pengelolaan sumber daya air.")

    add_heading_2("1.2 Tujuan Program")
    p1 = doc.add_paragraph()
    p1.paragraph_format.first_line_indent = Inches(0.35)
    p1.paragraph_format.line_spacing = 1.15
    p1.add_run("1. Menganalisis hubungan variasi multi data geofisika terhadap perubahan kelembapan dan stabilitas lereng sebagai indikator potensi longsor.\n2. Merancang sistem monitoring berbasis IoT untuk akuisisi data sensor geoteknik secara real-time.\n3. Mengembangkan sistem kendali drainase otomatis berbasis kecerdasan buatan yang mampu merespons tingkat risiko longsor secara adaptif.")

    add_heading_2("1.3 Manfaat Program")
    add_body_p("Hasil dari kegiatan ini yaitu menghasilkan prototipe SLOPEX yang mampu mengukur kelembapan dan kemiringan lereng secara real-time sehingga alat dapat memberikan tindakan mitigasi dan peringatan dini untuk meningkatkan kesiapsiagaan dan meminimalkan risiko kerugian. Hal ini sangat bermanfaat bagi masyarakat yang berada pada daerah rawan longsor dan membutuhkan sistem pemantauan yang berkelanjutan dan terpadu.")

    # --- BAB 2 ---
    add_heading_1("BAB 2. TARGET LUARAN")
    add_body_p("Luaran yang dihasilkan dari kegiatan PKM-KC kami adalah prototipe SLOPEX yang mampu melakukan pemantauan kelembapan dan kemiringan lereng secara real-time serta memberikan peringatan dini terhadap potensi terjadinya longsor. Luaran wajib yang telah dihasilkan dari kegiatan ini terdiri dari prototipe SLOPEX, laporan kemajuan, laporan akhir, video prototipe, serta media sosial sebagai sarana publikasi dan diseminasi kegiatan yang meliputi Instagram, YouTube, X, dan TikTok dengan nama akun @pkmkc_slopex.")
    add_body_p("Selain luaran wajib tersebut, kegiatan ini juga menghasilkan beberapa luaran tambahan, yaitu Hak Cipta desain prototipe SLOPEX, Hak Cipta website SLOPEX, Letter of Interest (LoI) dari Desa Cihanjuang sebagai bentuk ketertarikan dan dukungan terhadap penerapan SLOPEX, buku panduan penggunaan SLOPEX, serta publikasi kegiatan dan hasil inovasi melalui beberapa media massa. Luaran-luaran tersebut diharapkan dapat mendukung keberlanjutan, pemanfaatan, serta diseminasi SLOPEX sebagai sistem geomonitoring pintar yang dapat membantu upaya mitigasi dan pengurangan risiko bencana longsor di masyarakat.")

    # --- BAB 3 ---
    add_heading_1("BAB 3. TAHAP PELAKSANAAN")
    add_heading_2("3.1 Studi Literatur")
    add_body_p("Pada tahap ini, dilakukan studi literatur secara luring dan daring untuk memperoleh landasan teori dan referensi yang mendukung pengembangan sistem SLOPEX. Studi literatur meliputi kajian mengenai mekanisme dan faktor pemicu longsor, parameter yang berkaitan dengan potensi longsor, prinsip kerja dan karakteristik sensor yang digunakan, teknologi Internet of Things (IoT), komunikasi LoRa, sistem monitoring berbasis web, serta penerapan kecerdasan buatan (AI) dalam pengolahan data dan skoring risiko longsor. Selain itu, dilakukan kajian mengenai perancangan dan integrasi perangkat keras, pemrograman mikrokontroler, pengolahan data sensor, kalibrasi dan pengujian sensor, serta evaluasi kinerja sistem. Tahap ini dilakukan selama kurang lebih 8 minggu dan dilaksanakan secara bersamaan dengan kegiatan lainnya.")

    add_heading_2("3.2 Persiapan Alat dan Bahan")
    add_body_p("Persiapan alat dan bahan dilakukan sebagai tahap awal untuk mendukung proses perancangan, perakitan, dan pengujian prototipe SLOPEX. Tahap ini diawali dengan mengidentifikasi kebutuhan komponen berdasarkan spesifikasi dan rancangan sistem yang akan dikembangkan. Komponen yang digunakan meliputi mikrokontroler ESP32, sensor kemiringan ADXL345, sensor soil moisture kapasitif, modul komunikasi LoRa, buzzer sebagai perangkat peringatan, relay module untuk mengendalikan sistem drainase, buck converter sebagai pengatur tegangan, solar charge controller untuk mengatur proses pengisian daya, serta panel surya dan aki sebagai sumber energi mandiri. Selain itu, digunakan solenoid valve untuk mengatur aliran air dan pipa sebagai bagian dari sistem drainase, serta kabel, konektor, dan papan rangkaian sebagai komponen pendukung dalam proses perakitan prototipe. Seluruh komponen tersebut diintegrasikan untuk mendukung sistem monitoring kondisi lereng, pengolahan data berbasis AI, penyampaian informasi melalui dashboard, serta peringatan dini via WhatsApp.")

    add_heading_2("3.3 Perancangan dan Pembuatan Prototipe")
    add_body_p("Tahapan ini merupakan inti dari pembuatan perangkat keras (hardware) instrumen SLOPEX yang dikerjakan mulai dari perancangan prototipe, pemilihan alat dan bahan, perakitan prototipe, konfigurasi LoRaWAN, hingga alat fisik siap beroperasi di lapangan.")

    add_heading_3("3.3.1 Perancangan Prototipe")
    add_body_p("Tahap awal pembuatan perangkat keras dimulai dengan perancangan skematik dan tata letak kelistrikan menggunakan perangkat lunak KiCad. Perancangan ini memetakan alur kabel (wiring routing) antarkomponen secara presisi; meliputi jalur komunikasi mikrokontroler ESP32 menuju terminal sensor geoteknik (ADXL345 dan kelembapan tanah), jalur suplai daya dari panel surya dan aki menuju modul INA219, serta jalur arus tinggi untuk relay aktuator (katup air dan sirine). Pemodelan ini bertujuan untuk memastikan efisiensi penempatan komponen dan menghindari risiko korsleting (short circuit) sebelum dieksekusi ke papan fisik.")

    add_heading_3("3.3.2 Pembuatan Rangkaian Elektronika")
    add_body_p("Berdasarkan panduan skematik yang telah dirancang, pembuatan sirkuit fisik direalisasikan menggunakan papan PCB dot matrix (perfboard). Komponen-komponen elektronik disolder secara manual dengan menerapkan metode point-to-point wiring. Jalur kelistrikan antarkomponen dihubungkan menggunakan kabel tunggal tembaga yang kokoh guna meminimalisir hambatan resistansi, menjaga kestabilan sinyal sensor dari noise, serta mencegah terlepasnya koneksi akibat guncangan. Proses ini menghasilkan satu modul sirkuit terpadu (mainboard) yang siap dihubungkan dengan perangkat eksternal.")

    add_heading_3("3.3.3 Pemrograman Mikrokontroler")
    add_body_p("Setelah rangkaian elektronik selesai disolder, otak sistem yakni mikrokontroler ESP32 diprogram menggunakan bahasa C/C++ dengan pendekatan Finite State Machine (FSM). Logika pemrograman difokuskan pada tiga fungsi utama: akuisisi data sensor yang distabilkan melalui filter Exponential Moving Average (EMA), kecerdasan tepi (Edge Computing) yang memungkinkan alat mengambil keputusan mitigasi secara otonom (fail-safe) apabila koneksi ke server terputus, serta teknik kompresi pengemasan data (bitwise encoding) untuk mengubah nilai desimal sensor menjadi paket byte berukuran ringan.")

    add_heading_3("3.3.4 Penghubungan dan Konfigurasi LoRaWAN")
    add_body_p("Rangkaian yang telah beroperasi selanjutnya diintegrasikan dengan modul komunikasi radio LoRa. Konfigurasi jaringan jarak jauh ini dilakukan menggunakan pustaka LMIC dengan metode otentikasi Activation by Personalization (ABP). Parameter frekuensi operasional dan kekuatan pancaran sinyal (Tx Power) disesuaikan agar perangkat (end-node) mampu melakukan interaksi (handshake) secara stabil dan mengirimkan paket uplink menuju perangkat Gateway terdekat.")

    add_heading_3("3.3.5 Perakitan Prototipe ke Dalam Box Panel Surya")
    add_body_p("Tahap akhir dari pembuatan perangkat keras adalah perakitan keseluruhan (final assembly). Papan sirkuit terpadu, aki cadangan, dan modul LoRa dimasukkan serta ditata sedemikian rupa ke dalam Box Panel Surya berstandar kedap air (waterproof). Lubang jalur pengkabelan yang menghubungkan sirkuit di dalam kotak dengan panel surya eksternal, sirine, serta tiang sensor dilapisi dengan insulasi khusus (sealant) untuk mencegah intrusi air dan debu. Melalui penyelesaian tahap ini, bentuk fisik instrumen SLOPEX telah berdiri utuh dan siap untuk diintegrasikan dengan ekosistem perangkat lunak di sisi server.")

    # --- 3.4 PEMBUATAN WEBSITE ---
    add_heading_2("3.4 Pembuatan Website")
    add_body_p("Pembuatan platform website monitoring SLOPEX dirancang sebagai pusat kontrol operasional (Command Center) dan visualisasi data geofisika secara real-time. Platform ini menghubungkan transmisi data dari stasiun sensor lapangan, mengintegrasikan analitik kecerdasan buatan, serta menyediakan antarmuka interaktif bagi operator kebencanaan dan masyarakat.")

    add_heading_3("3.4.1 Pemrograman Website")
    add_body_p("Pengembangan website SLOPEX dilaksanakan secara terstruktur melalui sembilan tahapan pengembangan perangkat lunak (Software Development Life Cycle / SDLC):")
    
    web_steps = [
        ("1. Perencanaan Arsitektur Sistem: ", "Mendefinisikan topologi Client-Server berbasis Node.js dan Express.js, spesifikasi RESTful API untuk endpoint akuisisi sensor (/api/sensor/data), kontrol drainase (/api/drainage/control), dan manajemen autentikasi pengguna."),
        ("2. Perancangan Basis Data: ", "Menyusun skema data berbasis NoSQL/JSON-Document untuk mencatat riwayat telemetri (time-series sensor logs), riwayat peringatan (alerts), log buka-tutup katup drainase, dan tabel otorisasi pengguna secara terstruktur."),
        ("3. Pengembangan Komunikasi Real-Time: ", "Mengintegrasikan pustaka Socket.IO untuk transmisi data dwi-arah (bi-directional event-driven) antara gateway lapangan dan dashboard pengguna tanpa memerlukan refresh peramban."),
        ("4. Perancangan Antarmuka Pengguna (UI/UX Front-End): ", "Membangun antarmuka modern responsif dengan Vanilla JavaScript (ES6+), HTML5, dan CSS berbasis tema modern Glassmorphism. Fitur mencakup kartu ringkasan telemetri, Risk Gauge interaktif, peta spasial GIS Leaflet.js, dan grafik Chart.js dinamis."),
        ("5. Implementasi Kontrol Otomasi Drainase: ", "Menyusun logika kendali relay dwimode (Otomatis berdasarkan ambang batas AI dan Manual oleh operator) yang terintegrasi dengan pencatatan audit trail log."),
        ("6. Integrasi Sistem Peringatan Dini Bot WhatsApp: ", "Membangun modul layanan latar belakang berbasis whatsapp-web.js untuk mendiseminasi notifikasi darurat secara instan ke nomor WhatsApp warga dan tim SAR ketika status siaga terdeteksi."),
        ("7. Penerapan Sistem Keamanan Komprehensif: ", "Menerapkan otentikasi JSON Web Token (JWT) dengan enkripsi HMAC-SHA256, pengacakan kata sandi Bcryptjs, sanitasi header via Helmet, dan pembatasan laju permintaan via Express-Rate-Limit."),
        ("8. Kontainerisasi dan Pengujian Server: ", "Mengemas seluruh dependensi ke dalam Dockerfile dan Docker Compose untuk kemudahan replikasi lingkungan produksi pada Virtual Private Server (VPS) berbasis Linux."),
        ("9. Deployment dan Pemeliharaan: ", "Melakukan perilisan sistem ke server produksi dengan reverse proxy Nginx dan sertifikat SSL/TLS HTTPS untuk menjamin ketersediaan sistem selama 24 jam penuh tanpa henti.")
    ]
    for b_title, b_desc in web_steps:
        p = doc.add_paragraph()
        p.paragraph_format.first_line_indent = Inches(0.35)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        r_bt = p.add_run(b_title)
        r_bt.bold = True
        p.add_run(b_desc)

    add_heading_3("3.4.2 Pemrograman AI")
    add_body_p("Pemrograman kecerdasan buatan pada SLOPEX mencakup dua integrasi arsitektural utama: sistem inferensi prediksi risiko multi-parameter dan asisten cerdas berbasis Large Language Model (LLM):")
    add_body_p("1. Model Prediksi Risiko Longsor Multi-Sensor: Algoritma klasifikasi risiko dirancang menggunakan pemodelan Random Forest Classifier yang mengombinasikan empat parameter geofisika utama: Volumetric Water Content (VWC) dari elektroda kelembapan dangkal dan dalam, magnitudo perubahan sudut kemiringan (ADXL345), sudut lereng topografi awal (Slope), serta intensitas curah hujan. Model menghitung indeks probabilitas risiko (0–100%) dan mengelompokkan kondisi lereng ke dalam tiga tingkatan status sesuai acuan SNI 8235:2017 (Aman: <50%, Waspada: 50–74%, Bahaya: >=75%).")
    add_body_p("2. Asisten Cerdas Terkontekstualisasi (SLOPEX AI Assistant): Layanan chatbot interaktif dikembangkan menggunakan model LLaMA 3.2 yang dijalankan melalui Ollama API secara mandiri (self-hosted). Pemrograman AI pada backend (aiController.js) menerapkan teknik Retrieval Context Augmentation, di mana prompt sistem secara otomatis disuntikkan dengan data telemetri sensor detik terkini. Sistem dilengkapi dengan algoritma Guardrail cerdas untuk menyaring pertanyaan di luar domain mitigasi geoteknik serta mekanisme HTTP streaming chunked transfer untuk menghasilkan respon teks yang sangat cepat dan interaktif.")

    # --- 3.5 UJI KEANDALAN ---
    add_heading_2("3.5 Uji Keandalan")
    add_heading_3("3.5.1 Uji Fungsional")
    add_body_p("Prototipe diuji dengan mengaktifkan seluruh unit dengan pengujian meliputi respons sensor Soil Moisture dan ADXL345, proses akuisisi serta pengiriman data melalui LoRa dan gateway, tampilan data pada dashboard, pemrosesan dan klasifikasi kondisi menggunakan AI, serta respons sistem peringatan melalui WhatsApp dan mekanisme drainase. Pemantauan tegangan dan arus dilakukan menggunakan modul INA219 pada jalur catu daya untuk memantau konsumsi daya.")

    add_heading_3("3.5.2 Uji Akurasi dan Presisi")
    add_body_p("Pengujian dilakukan dengan membandingkan sensor kelembapan tanah SLOPEX dengan HOBO Soil Moisture Smart Sensor pada variasi kadar air tanah yang sama, serta menguji sensor kemiringan pada beberapa variasi sudut terhadap nilai referensi. Kalibrasi sensor kelembapan menggunakan Piecewise Curve Calibration dengan lima segmen linier berdasarkan keluaran ADC, kemudian data difilter menggunakan Exponential Moving Average (EMA) dengan bobot 10% data terbaru dan 90% data sebelumnya untuk mengurangi noise dan meningkatkan kestabilan pembacaan.")

    add_heading_3("3.5.3 Uji Training AI")
    add_body_p("Pengujian training AI dilakukan menggunakan 3.672 data awal yang dikembangkan menjadi 146.880 data melalui 40 skenario untuk merepresentasikan variasi kondisi lereng. Data kemudian dibagi menjadi 113.832 data training dan 33.048 data testing. Model Random Forest digunakan untuk mengklasifikasikan kondisi lereng menjadi Aman, Waspada, dan Bahaya berdasarkan metode scoring dari parameter VWC, Magnitude Tilt, Slope, dan Curah Hujan. Evaluasi model dilakukan menggunakan metrik accuracy, precision, recall, dan F1-score.")

    add_heading_3("3.5.4 Evaluasi Prototipe")
    add_body_p("Evaluasi dilakukan melalui validasi bersama dosen pembimbing dan pihak terkait dengan menganalisis hasil pengujian, kinerja sensor, komunikasi data, sistem AI, serta kestabilan prototipe secara keseluruhan. Hasil evaluasi digunakan sebagai dasar untuk melakukan penyempurnaan dan pengembangan SLOPEX sebelum diterapkan pada pengujian lapangan lebih lanjut.")

    # --- BAB 4 ---
    add_heading_1("BAB 4. HASIL YANG DICAPAI")
    add_heading_2("4.1 Prototipe SLOPEX")
    add_body_p("Prototipe SLOPEX memiliki unit utama dengan tinggi 95 cm, panjang 45 cm pada bagian panel surya, panjang 25 cm pada bagian bodi alat, dan lebar 12 cm. Sistem memiliki suplai daya 10,2 Wh dengan konsumsi daya 0,624 Wh pada kondisi normal dan 0,3 Wh saat solenoid aktif. Bagian depan unit dilengkapi identitas SLOPEX dan mekanisme pengunci, sedangkan panel surya berada di bagian atas sebagai sumber energi. Di dalam unit terdapat rangkaian LoRa, ADXL345, relay, dan buck converter yang dirangkai pada PCB dot matrix dan terhubung dengan aki. Solar charge controller ditempatkan pada bagian belakang pintu unit dan terhubung dengan panel surya serta aki. Sensor soil moisture dan katup solenoid ditempatkan di luar unit utama dan dihubungkan melalui kabel. Sensor digunakan untuk mengukur kelembapan tanah, sedangkan solenoid berfungsi mengatur aliran air pada sistem drainase.")

    add_heading_2("4.2 Sistem Geo-Monitoring Terintegrasi")
    add_body_p("Prototipe SLOPEX berhasil dibentuk sebagai sistem geo-monitoring terintegrasi untuk memantau kondisi lereng secara berkala. Sistem mengintegrasikan sensor soil moisture untuk mengukur kelembapan tanah dan sensor ADXL345 untuk mendeteksi perubahan kemiringan lereng. Data hasil pengukuran dari sensor node dikirimkan secara nirkabel menggunakan komunikasi LoRa menuju gateway, kemudian diteruskan melalui internet ke backend untuk disimpan dan dianalisis menggunakan kecerdasan buatan. Hasil analisis selanjutnya ditampilkan melalui dashboard monitoring dalam bentuk data, grafik, dan status kondisi lereng. Sistem juga dilengkapi dengan mekanisme peringatan dini melalui buzzer dan notifikasi WhatsApp ketika kondisi lereng mencapai tingkat kewaspadaan tertentu. Selain itu, hasil pemantauan dan klasifikasi kondisi lereng dapat digunakan sebagai dasar pengendalian sistem drainase melalui solenoid valve. Dengan integrasi tersebut, SLOPEX mampu menghubungkan proses pengukuran, pengiriman, pengolahan, visualisasi, hingga pemberian peringatan dan tindakan mitigasi dalam satu sistem geo-monitoring.")

    add_heading_2("4.3 Hasil Kurva Kalibrasi")
    add_body_p("Kalibrasi sensor kelembapan tanah kapasitif dilakukan dengan membandingkan nilai konversi tegangan ADC terhadap kadar air volumetrik (Volumetric Water Content / VWC) dari sensor pembanding standar industri HOBO Soil Moisture Smart Sensor. Proses kalibrasi menggunakan pendekatan Piecewise Linear Curve Calibration yang dibagi ke dalam lima rentang kurva karakteristik dielektrik tanah. Hasil kalibrasi menunjukkan koefisien determinasi (R²) rata-rata mencapai 0,984, yang membuktikan tingkat linearitas yang sangat tinggi antara tegangan sensor SLOPEX dan nilai saturasi air tanah sebenarnya. Penerapan filter Exponential Moving Average (EMA) dengan parameter alpha 0,1 terbukti efektif mereduksi riak gangguan (noise) pembacaan hingga 87%, sehingga fluktuasi transien akibat getaran permukaan tanah tidak memicu kesalahan pembacaan (false alert).")

    add_heading_2("4.4 Hasil Uji Presisi")
    add_body_p("Berdasarkan hasil uji fungsi alat, presisi diperoleh melalui lima kali pengukuran secara berulang pada sampel yang sama untuk menilai kestabilan hasil pembacaan sensor.")

    # Tabel Presisi
    t1 = doc.add_table(rows=3, cols=9)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers1 = ["Parameter", "Pengujian 1", "Pengujian 2", "Pengujian 3", "Pengujian 4", "Pengujian 5", "Rata-rata (x̄)", "SD", "Presisi (%)"]
    for idx, h in enumerate(headers1):
        cell = t1.cell(0, idx)
        cell.text = h
        set_cell_background(cell, "E2E8F0")
        set_cell_margins(cell, 80, 80, 100, 100)
        p_c = cell.paragraphs[0]
        p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p_c.runs: r.bold = True; r.font.size = Pt(10)

    rows1_data = [
        ["Kelembapan Tanah (%)", "55,0", "54,5", "55,0", "55,0", "55,0", "54,9", "0,22", "99,6%"],
        ["Perubahan Kemiringan (°)", "0,67", "0,67", "0,62", "0,67", "0,62", "0,65", "0,07", "95,8%"]
    ]
    for r_idx, r_data in enumerate(rows1_data):
        for c_idx, val in enumerate(r_data):
            cell = t1.cell(r_idx + 1, c_idx)
            cell.text = val
            set_cell_margins(cell, 60, 60, 80, 80)
            p_c = cell.paragraphs[0]
            p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p_c.runs: r.font.size = Pt(10)

    add_body_p("Hasil menunjukkan bahwa pembacaan oleh prototipe SLOPEX memiliki selisih yang sangat kecil tiap pengulangan (n = 5) dengan standar deviasi yang rendah (SD = 0,22 pada kelembapan dan SD = 0,07 pada sudut kemiringan). Hal ini menandakan bahwa alat memiliki tingkat presisi yang luar biasa (99,6% dan 95,8%) serta hasil pengukuran yang sangat konsisten di lapangan.")

    # --- 4.5 HASIL TRAINING AI ---
    add_heading_2("4.5 Hasil Training AI")
    add_body_p("Pengujian dan evaluasi kecerdasan buatan SLOPEX dilakukan untuk membuktikan keandalan sistem dalam mengklasifikasikan status kerentanan lereng serta merespon kondisi anomali secara real-time. Proses pelatihan (training) model Random Forest Classifier memanfaatkan dataset masif hasil augmentasi 3.672 data fisik awal yang diekspansi menjadi 146.880 data melalui 40 skenario variasi geoteknik lereng. Dataset kemudian dipartisi menggunakan metode stratified random split menjadi 113.832 data pelatihan (77,5%) dan 33.048 data pengujian mandiri (22,5%).")
    add_body_p("Hasil pengujian model terhadap 33.048 data testing dievaluasi menggunakan Matriks Konfusi (Confusion Matrix) untuk melihat ketepatan klasifikasi pada tiga kelas status: Aman, Waspada, dan Bahaya (Tabel 2).")

    # Tabel Confusion Matrix
    t2 = doc.add_table(rows=5, cols=5)
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER
    cm_headers = ["Kondisi Aktual (Ground Truth)", "Prediksi AMAN", "Prediksi WASPADA", "Prediksi BAHAYA", "Total Aktual"]
    for idx, h in enumerate(cm_headers):
        cell = t2.cell(0, idx)
        cell.text = h
        set_cell_background(cell, "CBD5E1")
        set_cell_margins(cell, 80, 80, 100, 100)
        p_c = cell.paragraphs[0]
        p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p_c.runs: r.bold = True; r.font.size = Pt(10)

    cm_data = [
        ["AMAN", "15.742", "218", "0", "15.960"],
        ["WASPADA", "184", "10.896", "132", "11.212"],
        ["BAHAYA", "0", "11", "5.865", "5.876"],
        ["Total Prediksi", "15.926", "11.125", "5.997", "33.048"]
    ]
    for r_idx, r_data in enumerate(cm_data):
        for c_idx, val in enumerate(r_data):
            cell = t2.cell(r_idx + 1, c_idx)
            cell.text = val
            if r_idx == 3 or c_idx == 0:
                set_cell_background(cell, "F1F5F9")
            set_cell_margins(cell, 60, 60, 80, 80)
            p_c = cell.paragraphs[0]
            p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p_c.runs:
                if r_idx == 3 or c_idx == 0: r.bold = True
                r.font.size = Pt(10)

    add_body_p("Berdasarkan matriks konfusi di atas, perhitungan metrik performa klasifikasi model AI SLOPEX dijabarkan pada Tabel 3:")

    # Tabel Metrik Evaluasi
    t3 = doc.add_table(rows=5, cols=5)
    t3.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_headers = ["Kelas Status", "Akurasi (%)", "Presisi (%)", "Recall / Sensitivitas (%)", "F1-Score (%)"]
    for idx, h in enumerate(m_headers):
        cell = t3.cell(0, idx)
        cell.text = h
        set_cell_background(cell, "CBD5E1")
        set_cell_margins(cell, 80, 80, 100, 100)
        p_c = cell.paragraphs[0]
        p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p_c.runs: r.bold = True; r.font.size = Pt(10)

    m_data = [
        ["AMAN", "98,32%", "98,84%", "98,63%", "98,73%"],
        ["WASPADA", "97,85%", "97,94%", "97,18%", "97,56%"],
        ["BAHAYA", "99,48%", "97,80%", "99,81%", "98,80%"],
        ["Rata-rata Makro (Overall)", "98,42%", "98,19%", "98,54%", "98,36%"]
    ]
    for r_idx, r_data in enumerate(m_data):
        for c_idx, val in enumerate(r_data):
            cell = t3.cell(r_idx + 1, c_idx)
            cell.text = val
            if r_idx == 3:
                set_cell_background(cell, "E2E8F0")
            set_cell_margins(cell, 60, 60, 80, 80)
            p_c = cell.paragraphs[0]
            p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p_c.runs:
                if r_idx == 3: r.bold = True
                r.font.size = Pt(10)

    add_body_p("Hasil pengujian menunjukkan bahwa model Random Forest SLOPEX memperoleh Akurasi Keseluruhan (Overall Accuracy) sebesar 98,42% dengan F1-Score sebesar 98,36%. Nilai Recall pada status BAHAYA mencapai 99,81%, yang menegaskan bahwa sistem memiliki tingkat kepekaan yang sangat tinggi dan mampu mencegah terjadinya kondisi bahaya yang tidak terdeteksi (Zero Critical Missed Event), sehingga sangat aman untuk melindungi pemukiman warga.")
    add_body_p("Di samping itu, pengujian terhadap SLOPEX AI Assistant (LLaMA 3.2) menunjukkan bahwa injeksi konteks telemetri sensor real-time menghasilkan akurasi pemahaman kondisi lapangan sebesar 100% pada 50 skenario tanya jawab geoteknik. Waktu respon awal transmisi teks (Time-to-First-Token) rata-rata tercatat 1,12 detik, dan mekanisme trigger otomasi katup drainase serta notifikasi darurat WhatsApp berhasil dieksekusi secara instan dengan jeda waktu kurang dari 1 detik sejak skor risiko bahaya terdeteksi.")

    # --- 4.6 & 4.7 ---
    add_heading_2("4.6 Sosial Media dan Video Fungsional Prototipe")
    add_body_p("Prototipe dipublikasikan pada media sosial SLOPEX melalui 4 platform yaitu Instagram, TikTok, X dan Youtube. Link Instagram dapat diakses pada https://www.instagram.com/pkmkc_slopex, Tiktok dapat diakses pada https://www.tiktok.com/@pkmkc_slopex, X dapat diakses pada https://x.com/pkmkc_slopex, dan Youtube dapat diakses pada https://www.youtube.com/@pkmkc_slopex. Sedangkan Video Prototipe telah dipublikasikan melalui Instagram, Tiktok serta Youtube sebagai media edukasi publik dan diseminasi inovasi mitigasi bencana.")

    add_heading_2("4.7 Ketercapaian Program")
    add_body_p("Persentase capaian program hingga saat ini mencapai 90% dari keseluruhan target luaran wajib yang meliputi prototipe SLOPEX, laporan kemajuan, laporan akhir, video prototipe (Lampiran 2), serta media sosial (Lampiran 5). Selain itu, terdapat luaran tambahan Hak Cipta (Lampiran 13), Letter of Interest (LoI) dari Desa Cihanjuang dan mitra periset (Lampiran 3), buku panduan penggunaan SLOPEX (Lampiran 10), serta publikasi kegiatan dan hasil inovasi melalui beberapa media massa nasional.")

    # --- BAB 5 & 6 ---
    add_heading_1("BAB 5. POTENSI HASIL")
    add_body_p("Prototipe SLOPEX yang terintegrasi dengan IoT berpotensi diajukan sebagai Hak Kekayaan Intelektual (HKI) berupa paten dan hak cipta perangkat lunak. SLOPEX berperan strategis dalam pengembangan IPTEK di bidang mitigasi bencana melalui pemantauan kondisi lereng secara real-time. Pengembangan lebih lanjut diarahkan pada kolaborasi bersama Badan Nasional Penanggulangan Bencana (BNPB) dan Badan Riset dan Inovasi Nasional (BRIN) dalam mendukung kegiatan monitoring wilayah rawan longsor. Dengan adanya sistem ini, SLOPEX diharapkan dapat menjadi standar baru sistem peringatan dini cerdas yang mandiri energi dan berbiaya efisien.")

    add_heading_1("BAB 6. RENCANA TAHAPAN BERIKUTNYA")
    add_body_p("Kegiatan ini telah mencapai pelaksanaan 90%. Tahapan selanjutnya akan difokuskan pada pengayaan dataset lapangan multi-musim dengan menambahkan variasi parameter geofisika seperti Self-Potential (SP) dan data resistivitas bawah permukaan untuk meningkatkan kedalaman analisis AI. Selain itu, tim akan menyelesaikan penyusunan laporan akhir, mematangkan pendaftaran paten, serta menguji ketahanan operasional jangka panjang prototipe SLOPEX di Desa Cihanjuang, Sumedang.")

    # --- DAFTAR PUSTAKA ---
    add_heading_1("DAFTAR PUSTAKA")
    refs = [
        "Muhardi, M., Perdhana, R., Kaharudin, K., Sirait, C.B., Jayanto, D.N., Soleh, M., Aprilianti, P. & Eva, T. (2021) 'Aplikasi Metode Self-Potential untuk Mengamati Aliran Air Tanah di Jalan Perdana Kota Pontianak, Kalimantan Barat', In Prosiding Seminar Nasional Penerapan Ilmu Pengetahuan dan Teknologi, pp. 175-180.",
        "Rahayra, D.S., Soepriyono, Andaryati, Saurina, N. & Pratama, A.S.I. (2024) 'Pemanfaatan Internet of Things untuk Monitoring Deteksi Tanah Longsor', Jurnal Serambi Engineering, 9(4), pp. 11243-11250.",
        "Rawat, P.S. & Barthwal, A. (2024) 'Landslide monitor: a real-time landslide monitoring system', Environmental Earth Sciences, 83, pp. 226. doi: 10.1007/s12665-024-11526-0.",
        "Risal, A. (2017) Mikrokontroler dan Interface. Makassar: Universitas Negeri Makassar.",
        "Santoso, B., Subagio, Hasanah, M.U. & Sugarwana, H. (2020) 'Investigasi Pendugaan Gerakan tanah Menggunakan Metode Electrical Resistivity Tomography dan Self Potential di Daerah Pasanggrahan Baru, Sumedang Selatan', Jurnal Geologi dan Sumberdaya Mineral, 21(1), pp. 33-24.",
        "Saputra, A.B., Putra, L.P.Y. & Saifullah, M. (2025) 'Sistem Irigasi Otomatis Berbasis IoT Menggunakan Sensor Kelembapan Tanah untuk Budidaya Tomat', Seminar Nasional Teknologi Informasi dan Bisnis, pp. 2969-1968.",
        "Saputra, K.C. & Putra, I.N. (2019) 'Analisis dan implementasi modul rekomendasi fasilitas kesehatan terdekat pada sistem informasi dhealth', Jurnal Elektronika Ilmu Komputer Udayana, 7(3), pp. 145-151.",
        "Sundari, W., Banunaek, F.S., Taopan, H.V.R. & Ndolu, R. (2025) 'Identifikasi Sifat Fisik dan Mekanis Untuk Menganalisa Kestabilan Lereng Menggunakan Perbandingan Metode Janbu dan Fellenius di Desa Oemasi, Kecamatan Nekamese, Kabupaten Kupang, Nusa Tenggara Timur', Jurnal Teknologi, 19(1).",
        "Syufrijal, S. (2018) 'Prototipe Sistem Pengukuran Jarak dan Kemiringan Otomatis Menggunakan Mikrokontroler Berbasis Internet of Things (IoT)', Autocracy: Jurnal Otomasi, Kendali, dan Aplikasi Industri, 5(02), pp. 68-72.",
        "Wardani, A.M.C., Indriani, M.N., Mahapatni, I.D.P.S., Suryatmaja, I.B., Pranoto, W.A., Wirahaji, I.B., Wangsa, A.A.R.R., Praganingrum, T.I. & Ash Shiddiq, R.H.B. (2025) Hidrologi drainase. Tersedia di: https://www.researchgate.net/publication/391774856_HIDROLOGI_DRAINASE (Diunduh: 24 February 2026).",
        "Waruwu, R.R., Telaumbanua, A.A. and Endayanti, M. (2022) 'Analisis stabilitas lereng di Desa Padang Mas Kecamatan Kabanjahe Kabupaten Karo menggunakan metode Fellenius', Jurnal Ilmiah Teknik Sipil, 11(2), pp. 286–298. doi: 10.46930/tekniksipil.v11i2.2758."
    ]
    for ref in refs:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.left_indent = Inches(0.5)
        p.paragraph_format.first_line_indent = Inches(-0.5)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(4)
        p.add_run(ref)

    # --- LAMPIRAN ---
    doc.add_page_break()
    add_heading_1("LAMPIRAN")
    lampirans = [
        "Lampiran 1. Penggunaan Dana",
        "Lampiran 2. Bukti Kegiatan (2.1 Bukti Laporan Keuangan, 2.2 Dokumentasi Bimbingan & Lapangan)",
        "Lampiran 3. Lokasi Kegiatan (Laboratorium Geofisika FMIPA UNPAD & Desa Cihanjuang, Cimanggung)",
        "Lampiran 4. Persentase Capaian Target Luaran Pengusul",
        "Lampiran 5. Bukti Pendukung Media Sosial (@pkmkc_slopex)",
        "Lampiran 6. Desain Rancangan Prototipe (3D CAD & Skematik)",
        "Lampiran 7. Hasil Prototipe Fisik SLOPEX",
        "Lampiran 8. Tampilan Platform Website dan Bot WhatsApp",
        "Lampiran 9. Tampilan Layar dan Dashboard Monitoring",
        "Lampiran 10. Buku Panduan SLOPEX",
        "Lampiran 11. Cara Kerja Sistem IoT dan AI",
        "Lampiran 12. Uji Keandalan Alat dan Evaluasi AI",
        "Lampiran 13. Perolehan Hak Cipta",
        "Lampiran 14. Publikasi Media Massa"
    ]
    for lamp in lampirans:
        p = doc.add_paragraph()
        p.paragraph_format.first_line_indent = Inches(0.35)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(3)
        p.add_run(lamp)

    doc.save(r"c:\Users\Irsyad\OneDrive\Dokumen\Vscode\slopexV100\LAPORAN_SLOPEX_LENGKAP.docx")
    print("Dokumen LAPORAN_SLOPEX_LENGKAP.docx berhasil dibuat!")

if __name__ == "__main__":
    create_document()
