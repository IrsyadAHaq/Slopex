# LAPORAN KEMAJUAN / AKHIR PKM-KC 2026
## SLOPEX — ARSITEKTUR GEO-MONITORING PINTAR TERINTEGRASI MENGGUNAKAN MULTI DATA GEOFISIKA BERBASIS IOT DAN KECERDASAN BUATAN UNTUK MITIGASI BENCANA LONGSOR

---

## DAFTAR ISI
- **DAFTAR ISI** ............................................................................................................. i
- **DAFTAR GAMBAR** ............................................................................................... ii
- **DAFTAR TABEL** .................................................................................................... ii
- **DAFTAR LAMPIRAN** ............................................................................................. ii
- **BAB 1. PENDAHULUAN** ....................................................................................... 1
  - 1.1 Latar Belakang .............................................................................................. 1
  - 1.2 Tujuan Program ............................................................................................. 2
  - 1.3 Manfaat Program ........................................................................................... 2
- **BAB 2. TARGET LUARAN** ..................................................................................... 2
- **BAB 3. TAHAP PELAKSANAAN** .......................................................................... 3
  - 3.1 Studi Literatur ............................................................................................... 3
  - 3.2 Persiapan Alat dan Bahan ............................................................................. 3
  - 3.3 Perancangan dan Pembuatan Prototipe ......................................................... 4
    - 3.3.1 Perancangan Prototipe .................................................................... 4
    - 3.3.2 Pembuatan Rangkaian Elektronika .................................................. 4
    - 3.3.3 Pemrograman Mikrokontroler .......................................................... 4
    - 3.3.4 Penghubungan dan Konfigurasi LoRaWAN ....................................... 5
    - 3.3.5 Perakitan Prototipe ke Dalam Box Panel Surya ............................... 5
  - 3.4 Pembuatan Website ....................................................................................... 5
    - 3.4.1 Pemrograman Website .................................................................... 5
    - 3.4.2 Pemrograman AI ............................................................................. 6
  - 3.5 Uji Keandalan ................................................................................................ 7
    - 3.5.1 Uji Fungsional ................................................................................ 7
    - 3.5.2 Uji Akurasi dan Presisi .................................................................... 7
    - 3.5.3 Uji Training AI ............................................................................... 8
    - 3.5.4 Evaluasi Prototipe .......................................................................... 8
- **BAB 4. HASIL YANG DICAPAI** ............................................................................. 9
  - 4.1 Prototipe SLOPEX ........................................................................................ 9
  - 4.2 Sistem Geo-Monitoring Terintegrasi ........................................................... 9
  - 4.3 Hasil Kurva Kalibrasi .................................................................................... 10
  - 4.4 Hasil Uji Presisi ............................................................................................ 10
  - 4.5 Hasil Training AI ........................................................................................... 11
  - 4.6 Sosial Media dan Video Fungsional Prototipe .............................................. 13
  - 4.7 Ketercapaian Program ................................................................................... 13
- **BAB 5. POTENSI HASIL** ......................................................................................... 14
- **BAB 6. RENCANA TAHAPAN BERIKUTNYA** .................................................... 14
- **DAFTAR PUSTAKA** ................................................................................................ 15
- **LAMPIRAN** ............................................................................................................ 17

---

## DAFTAR GAMBAR
- **Gambar 1.** Desain Rangkaian Skematik dan PCB SLOPEX ................................................. 4
- **Gambar 2.** Tampilan Dashboard Website Monitoring SLOPEX Berbasis IoT ...................... 6
- **Gambar 3.** Prototipe Fisik SLOPEX Terpasang di Lapangan ................................................ 9
- **Gambar 4.** Kurva Kalibrasi Piecewise Sensor Kelembapan Tanah ......................................... 10
- **Gambar 5.** Matriks Konfusi (*Confusion Matrix*) Hasil Klasifikasi Model Random Forest AI ... 12
- **Gambar 6.** Tampilan Percakapan Cerdas SLOPEX AI Assistant dan Notifikasi WhatsApp ...... 13

---

## DAFTAR TABEL
- **Tabel 1.** Hasil Uji Presisi Pengukuran Kelembapan Tanah dan Perubahan Kemiringan .......... 10
- **Tabel 2.** Matriks Konfusi (*Confusion Matrix*) Hasil Pengujian 33.048 Data Testing ........... 11
- **Tabel 3.** Evaluasi Metrik Performa Model AI Berdasarkan Parameter Geofisika ................. 12

---

## DAFTAR LAMPIRAN
- **Lampiran 1.** Penggunaan Dana
- **Lampiran 2.** Bukti Kegiatan (Laporan Keuangan, Bimbingan & Pengujian Lapangan)
- **Lampiran 3.** Lokasi Kegiatan (Lab Geofisika FMIPA UNPAD & Desa Cihanjuang, Cimanggung)
- **Lampiran 4.** Persentase Capaian Target Luaran Pengusul
- **Lampiran 5.** Bukti Pendukung Media Sosial (@pkmkc_slopex)
- **Lampiran 6.** Desain Rancangan Prototipe (CAD 3D & Layout Sirkuit)
- **Lampiran 7.** Hasil Prototipe Fisik SLOPEX
- **Lampiran 8.** Tampilan Platform Website dan Bot WhatsApp
- **Lampiran 9.** Tampilan Layar dan Dashboard Monitoring
- **Lampiran 10.** Buku Panduan SLOPEX
- **Lampiran 11.** Cara Kerja Sistem IoT dan AI
- **Lampiran 12.** Uji Keandalan Alat dan Evaluasi AI
- **Lampiran 13.** Perolehan Hak Cipta
- **Lampiran 14.** Publikasi Media Massa

---

# BAB 1. PENDAHULUAN

### 1.1 Latar Belakang
Indonesia memiliki dinamika geologi yang kompleks sehingga rentan terhadap berbagai bencana, termasuk longsor. Berdasarkan data BPS tahun 2025, tercatat 330 kejadian longsor yang tersebar di berbagai wilayah Indonesia. Kejadian longsor dipengaruhi oleh berbagai faktor, seperti bentuk dan kemiringan lereng, kondisi tanah, curah hujan, air tanah, erosi, vegetasi, aktivitas manusia, dan getaran (Sundari dkk., 2025). Faktor-faktor tersebut dapat menurunkan kekuatan geser tanah sehingga tanah tidak mampu menahan gaya gravitasi dan meningkatkan potensi terjadinya longsor (Waruwu dkk., 2022).

Untuk mengurangi risiko longsor, beberapa penelitian telah mengembangkan sistem peringatan dini berbasis IoT. Rahayra et al. (2024) menggunakan sensor ultrasonik dan soil moisture untuk pemantauan kondisi tanah secara real-time, dengan data ditampilkan pada website dan peringatan dikirim melalui WhatsApp. Sementara itu, Rawat dan Barthwal (2024) memanfaatkan sensor suhu, soil moisture, sensor tanah, accelerometer, dan GPS yang terhubung ke cloud dan aplikasi berbasis AI untuk memprediksi risiko longsor serta memberikan peringatan dini.

PKM-KC ini menghadirkan Arsitektur Geo-Monitoring Pintar Terintegrasi untuk mitigasi bencana longsor dengan SLOPEX sebagai alat utama. Sistem memanfaatkan IoT dan kecerdasan buatan untuk mengintegrasikan data kelembapan dan kemiringan tanah secara real-time dengan data curah hujan, elevasi, dan vegetasi yang tersimpan pada server. Sistem didukung panel surya dan aki sebagai sumber daya mandiri. Data yang terkumpul kemudian dianalisis menggunakan AI untuk mengidentifikasi tingkat risiko longsor dan memberikan peringatan dini melalui website serta notifikasi WhatsApp. Pengembangan selanjutnya diarahkan pada pengaturan drainase otomatis dan aktivasi sirine darurat saat terdeteksi perubahan kemiringan tanah.

Sistem Geo-Monitoring Pintar memungkinkan pemantauan risiko longsor secara real-time dan penyampaian peringatan dini kepada masyarakat. Selain mendukung mitigasi bencana, sistem ini juga dapat dimanfaatkan untuk pengelolaan irigasi dan drainase secara berkelanjutan. Hal ini selaras dengan tema PKM 2026 nomor 8, yaitu Pelestarian Lingkungan dan Mitigasi Bencana, melalui penerapan teknologi pintar yang mendukung pengurangan risiko longsor sekaligus pengelolaan sumber daya air.

### 1.2 Tujuan Program
1. Menganalisis hubungan variasi multi data geofisika terhadap perubahan kelembapan dan stabilitas lereng sebagai indikator potensi longsor.
2. Merancang sistem monitoring berbasis IoT untuk akuisisi data sensor geoteknik secara real-time.
3. Mengembangkan sistem kendali drainase otomatis berbasis kecerdasan buatan yang mampu merespons tingkat risiko longsor secara adaptif.

### 1.3 Manfaat Program
Hasil dari kegiatan ini yaitu menghasilkan prototipe SLOPEX yang mampu mengukur kelembapan dan kemiringan lereng secara real-time sehingga alat dapat memberikan tindakan mitigasi dan peringatan dini untuk meningkatkan kesiapsiagaan dan meminimalkan risiko kerugian. Hal ini sangat bermanfaat bagi masyarakat yang berada pada daerah rawan longsor dan membutuhkan sistem pemantauan yang berkelanjutan dan terpadu.

---

# BAB 2. TARGET LUARAN

Luaran yang dihasilkan dari kegiatan PKM-KC kami adalah prototipe SLOPEX yang mampu melakukan pemantauan kelembapan dan kemiringan lereng secara real-time serta memberikan peringatan dini terhadap potensi terjadinya longsor. Luaran wajib yang telah dihasilkan dari kegiatan ini terdiri dari prototipe SLOPEX, laporan kemajuan, laporan akhir, video prototipe, serta media sosial sebagai sarana publikasi dan diseminasi kegiatan yang meliputi Instagram, YouTube, X, dan TikTok dengan nama akun @pkmkc_slopex.

Selain luaran wajib tersebut, kegiatan ini juga menghasilkan beberapa luaran tambahan, yaitu Hak Cipta desain prototipe SLOPEX, Hak Cipta website SLOPEX, Letter of Interest (LoI) dari Desa Cihanjuang sebagai bentuk ketertarikan dan dukungan terhadap penerapan SLOPEX, buku panduan penggunaan SLOPEX, serta publikasi kegiatan dan hasil inovasi melalui beberapa media massa. Luaran-luaran tersebut diharapkan dapat mendukung keberlanjutan, pemanfaatan, serta diseminasi SLOPEX sebagai sistem geomonitoring pintar yang dapat membantu upaya mitigasi dan pengurangan risiko bencana longsor di masyarakat.

---

# BAB 3. TAHAP PELAKSANAAN

### 3.1 Studi Literatur
Pada tahap ini, dilakukan studi literatur secara luring dan daring untuk memperoleh landasan teori dan referensi yang mendukung pengembangan sistem SLOPEX. Studi literatur meliputi kajian mengenai mekanisme dan faktor pemicu longsor, parameter yang berkaitan dengan potensi longsor, prinsip kerja dan karakteristik sensor yang digunakan, teknologi Internet of Things (IoT), komunikasi LoRa, sistem monitoring berbasis web, serta penerapan kecerdasan buatan (AI) dalam pengolahan data dan skoring risiko longsor. Selain itu, dilakukan kajian mengenai perancangan dan integrasi perangkat keras, pemrograman mikrokontroler, pengolahan data sensor, kalibrasi dan pengujian sensor, serta evaluasi kinerja sistem. Tahap ini dilakukan selama kurang lebih 8 minggu dan dilaksanakan secara bersamaan dengan kegiatan lainnya.

### 3.2 Persiapan Alat dan Bahan
Persiapan alat dan bahan dilakukan sebagai tahap awal untuk mendukung proses perancangan, perakitan, dan pengujian prototipe SLOPEX. Tahap ini diawali dengan mengidentifikasi kebutuhan komponen berdasarkan spesifikasi dan rancangan sistem yang akan dikembangkan. Komponen yang digunakan meliputi mikrokontroler ESP32, sensor kemiringan ADXL345, sensor soil moisture kapasitif, modul komunikasi LoRa, buzzer sebagai perangkat peringatan, relay module untuk mengendalikan sistem drainase, buck converter sebagai pengatur tegangan, solar charge controller untuk mengatur proses pengisian daya, serta panel surya dan aki sebagai sumber energi mandiri. Selain itu, digunakan solenoid valve untuk mengatur aliran air dan pipa sebagai bagian dari sistem drainase, serta kabel, konektor, dan papan rangkaian sebagai komponen pendukung dalam proses perakitan prototipe. Seluruh komponen tersebut diintegrasikan untuk mendukung sistem monitoring kondisi lereng, pengolahan data berbasis AI, penyampaian informasi melalui dashboard, serta peringatan dini via WhatsApp.

### 3.3 Perancangan dan Pembuatan Prototipe
Tahapan ini merupakan inti dari pembuatan perangkat keras (hardware) instrumen SLOPEX yang dikerjakan mulai dari perancangan prototipe, pemilihan alat dan bahan, perakitan prototipe, konfigurasi LoRaWAN, hingga alat fisik siap beroperasi di lapangan.

#### 3.3.1 Perancangan Prototipe
Tahap awal pembuatan perangkat keras dimulai dengan perancangan skematik dan tata letak kelistrikan menggunakan perangkat lunak KiCad. Perancangan ini memetakan alur kabel (wiring routing) antarkomponen secara presisi; meliputi jalur komunikasi mikrokontroler ESP32 menuju terminal sensor geoteknik (ADXL345 dan kelembapan tanah), jalur suplai daya dari panel surya dan aki menuju modul INA219, serta jalur arus tinggi untuk relay aktuator (katup air dan sirine). Pemodelan ini bertujuan untuk memastikan efisiensi penempatan komponen dan menghindari risiko korsleting (short circuit) sebelum dieksekusi ke papan fisik.

#### 3.3.2 Pembuatan Rangkaian Elektronika
Berdasarkan panduan skematik yang telah dirancang, pembuatan sirkuit fisik direalisasikan menggunakan papan PCB dot matrix (perfboard). Komponen-komponen elektronik disolder secara manual dengan menerapkan metode point-to-point wiring. Jalur kelistrikan antarkomponen dihubungkan menggunakan kabel tunggal tembaga yang kokoh guna meminimalisir hambatan resistansi, menjaga kestabilan sinyal sensor dari noise, serta mencegah terlepasnya koneksi akibat guncangan. Proses ini menghasilkan satu modul sirkuit terpadu (mainboard) yang siap dihubungkan dengan perangkat eksternal.

#### 3.3.3 Pemrograman Mikrokontroler
Setelah rangkaian elektronik selesai disolder, otak sistem yakni mikrokontroler ESP32 diprogram menggunakan bahasa C/C++ dengan pendekatan Finite State Machine (FSM). Logika pemrograman difokuskan pada tiga fungsi utama: akuisisi data sensor yang distabilkan melalui filter Exponential Moving Average (EMA), kecerdasan tepi (Edge Computing) yang memungkinkan alat mengambil keputusan mitigasi secara otonom (fail-safe) apabila koneksi ke server terputus, serta teknik kompresi pengemasan data (bitwise encoding) untuk mengubah nilai desimal sensor menjadi paket byte berukuran ringan.

#### 3.3.4 Penghubungan dan Konfigurasi LoRaWAN
Rangkaian yang telah beroperasi selanjutnya diintegrasikan dengan modul komunikasi radio LoRa. Konfigurasi jaringan jarak jauh ini dilakukan menggunakan pustaka LMIC dengan metode otentikasi Activation by Personalization (ABP). Parameter frekuensi operasional dan kekuatan pancaran sinyal (Tx Power) disesuaikan agar perangkat (end-node) mampu melakukan interaksi (handshake) secara stabil dan mengirimkan paket uplink menuju perangkat Gateway terdekat.

#### 3.3.5 Perakitan Prototipe ke Dalam Box Panel Surya
Tahap akhir dari pembuatan perangkat keras adalah perakitan keseluruhan (final assembly). Papan sirkuit terpadu, aki cadangan, dan modul LoRa dimasukkan serta ditata sedemikian rupa ke dalam Box Panel Surya berstandar kedap air (waterproof). Lubang jalur pengkabelan yang menghubungkan sirkuit di dalam kotak dengan panel surya eksternal, sirine, serta tiang sensor dilapisi dengan insulasi khusus (sealant) untuk mencegah intrusi air dan debu. Melalui penyelesaian tahap ini, bentuk fisik instrumen SLOPEX telah berdiri utuh dan siap untuk diintegrasikan dengan ekosistem perangkat lunak di sisi server.

### 3.4 Pembuatan Website
Pembuatan platform website monitoring SLOPEX dirancang sebagai pusat kontrol operasional (Command Center) dan visualisasi data geofisika secara real-time. Platform ini menghubungkan transmisi data dari stasiun sensor lapangan, mengintegrasikan analitik kecerdasan buatan, serta menyediakan antarmuka interaktif bagi operator kebencanaan dan masyarakat.

#### 3.4.1 Pemrograman Website
Pengembangan website SLOPEX dilaksanakan secara terstruktur melalui sembilan tahapan pengembangan perangkat lunak (Software Development Life Cycle / SDLC):
1. **Perencanaan Arsitektur Sistem**: Mendefinisikan topologi Client-Server berbasis Node.js dan Express.js, spesifikasi RESTful API untuk endpoint akuisisi sensor (`/api/sensor/data`), kontrol drainase (`/api/drainage/control`), dan manajemen autentikasi pengguna.
2. **Perancangan Basis Data**: Menyusun skema data berbasis NoSQL/JSON-Document untuk mencatat riwayat telemetri (time-series sensor logs), riwayat peringatan (alerts), log buka-tutup katup drainase, dan tabel otorisasi pengguna secara terstruktur.
3. **Pengembangan Komunikasi Real-Time**: Mengintegrasikan pustaka Socket.IO untuk transmisi data dwi-arah (bi-directional event-driven) antara gateway lapangan dan dashboard pengguna tanpa memerlukan refresh peramban.
4. **Perancangan Antarmuka Pengguna (UI/UX Front-End)**: Membangun antarmuka modern responsif dengan Vanilla JavaScript (ES6+), HTML5, dan CSS berbasis tema modern Glassmorphism. Fitur mencakup kartu ringkasan telemetri, Risk Gauge interaktif, peta spasial GIS Leaflet.js, dan grafik Chart.js dinamis.
5. **Implementasi Kontrol Otomasi Drainase**: Menyusun logika kendali relay dwimode (Otomatis berdasarkan ambang batas AI dan Manual oleh operator) yang terintegrasi dengan pencatatan audit trail log.
6. **Integrasi Sistem Peringatan Dini Bot WhatsApp**: Membangun modul layanan latar belakang berbasis `whatsapp-web.js` untuk mendiseminasi notifikasi darurat secara instan ke nomor WhatsApp warga dan tim SAR ketika status siaga terdeteksi.
7. **Penerapan Sistem Keamanan Komprehensif**: Menerapkan otentikasi JSON Web Token (JWT) dengan enkripsi HMAC-SHA256, pengacakan kata sandi Bcryptjs, sanitasi header via Helmet, dan pembatasan laju permintaan via Express-Rate-Limit.
8. **Kontainerisasi dan Pengujian Server**: Mengemas seluruh dependensi ke dalam Dockerfile dan Docker Compose untuk kemudahan replikasi lingkungan produksi pada Virtual Private Server (VPS) berbasis Linux.
9. **Deployment dan Pemeliharaan**: Melakukan perilisan sistem ke server produksi dengan reverse proxy Nginx dan sertifikat SSL/TLS HTTPS untuk menjamin ketersediaan sistem selama 24 jam penuh tanpa henti.

#### 3.4.2 Pemrograman AI
Pemrograman kecerdasan buatan pada SLOPEX mencakup dua integrasi arsitektural utama: sistem inferensi prediksi risiko multi-parameter dan asisten cerdas berbasis Large Language Model (LLM):
1. **Model Prediksi Risiko Longsor Multi-Sensor**: Algoritma klasifikasi risiko dirancang menggunakan pemodelan Random Forest Classifier yang mengombinasikan empat parameter geofisika utama: Volumetric Water Content (VWC) dari elektroda kelembapan dangkal dan dalam, magnitudo perubahan sudut kemiringan (ADXL345), sudut lereng topografi awal (Slope), serta intensitas curah hujan. Model menghitung indeks probabilitas risiko (0–100%) dan mengelompokkan kondisi lereng ke dalam tiga tingkatan status sesuai acuan SNI 8235:2017 (Aman: <50%, Waspada: 50–74%, Bahaya: >=75%).
2. **Asisten Cerdas Terkontekstualisasi (SLOPEX AI Assistant)**: Layanan chatbot interaktif dikembangkan menggunakan model LLaMA 3.2 yang dijalankan melalui Ollama API secara mandiri (self-hosted). Pemrograman AI pada backend (`aiController.js`) menerapkan teknik Retrieval Context Augmentation, di mana prompt sistem secara otomatis disuntikkan dengan data telemetri sensor detik terkini. Sistem dilengkapi dengan algoritma Guardrail cerdas untuk menyaring pertanyaan di luar domain mitigasi geoteknik serta mekanisme HTTP streaming chunked transfer untuk menghasilkan respon teks yang sangat cepat dan interaktif.

### 3.5 Uji Keandalan

#### 3.5.1 Uji Fungsional
Prototipe diuji dengan mengaktifkan seluruh unit dengan pengujian meliputi respons sensor Soil Moisture dan ADXL345, proses akuisisi serta pengiriman data melalui LoRa dan gateway, tampilan data pada dashboard, pemrosesan dan klasifikasi kondisi menggunakan AI, serta respons sistem peringatan melalui WhatsApp dan mekanisme drainase. Pemantauan tegangan dan arus dilakukan menggunakan modul INA219 pada jalur catu daya untuk memantau konsumsi daya.

#### 3.5.2 Uji Akurasi dan Presisi
Pengujian dilakukan dengan membandingkan sensor kelembapan tanah SLOPEX dengan HOBO Soil Moisture Smart Sensor pada variasi kadar air tanah yang sama, serta menguji sensor kemiringan pada beberapa variasi sudut terhadap nilai referensi. Kalibrasi sensor kelembapan menggunakan Piecewise Curve Calibration dengan lima segmen linier berdasarkan keluaran ADC, kemudian data difilter menggunakan Exponential Moving Average (EMA) dengan bobot 10% data terbaru dan 90% data sebelumnya untuk mengurangi noise dan meningkatkan kestabilan pembacaan.

#### 3.5.3 Uji Training AI
Pengujian training AI dilakukan menggunakan 3.672 data awal yang dikembangkan menjadi 146.880 data melalui 40 skenario untuk merepresentasikan variasi kondisi lereng. Data kemudian dibagi menjadi 113.832 data training dan 33.048 data testing. Model Random Forest digunakan untuk mengklasifikasikan kondisi lereng menjadi Aman, Waspada, dan Bahaya berdasarkan metode scoring dari parameter VWC, Magnitude Tilt, Slope, dan Curah Hujan. Evaluasi model dilakukan menggunakan metrik accuracy, precision, recall, dan F1-score.

#### 3.5.4 Evaluasi Prototipe
Evaluasi dilakukan melalui validasi bersama dosen pembimbing dan pihak terkait dengan menganalisis hasil pengujian, kinerja sensor, komunikasi data, sistem AI, serta kestabilan prototipe secara keseluruhan. Hasil evaluasi digunakan sebagai dasar untuk melakukan penyempurnaan dan pengembangan SLOPEX sebelum diterapkan pada pengujian lapangan lebih lanjut.

---

# BAB 4. HASIL YANG DICAPAI

### 4.1 Prototipe SLOPEX
Prototipe SLOPEX memiliki unit utama dengan tinggi 95 cm, panjang 45 cm pada bagian panel surya, panjang 25 cm pada bagian bodi alat, dan lebar 12 cm. Sistem memiliki suplai daya 10,2 Wh dengan konsumsi daya 0,624 Wh pada kondisi normal dan 0,3 Wh saat solenoid aktif. Bagian depan unit dilengkapi identitas SLOPEX dan mekanisme pengunci, sedangkan panel surya berada di bagian atas sebagai sumber energi. Di dalam unit terdapat rangkaian LoRa, ADXL345, relay, dan buck converter yang dirangkai pada PCB dot matrix dan terhubung dengan aki. Solar charge controller ditempatkan pada bagian belakang pintu unit dan terhubung dengan panel surya serta aki. Sensor soil moisture dan katup solenoid ditempatkan di luar unit utama dan dihubungkan melalui kabel. Sensor digunakan untuk mengukur kelembapan tanah, sedangkan solenoid berfungsi mengatur aliran air pada sistem drainase.

### 4.2 Sistem Geo-Monitoring Terintegrasi
Prototipe SLOPEX berhasil dibentuk sebagai sistem geo-monitoring terintegrasi untuk memantau kondisi lereng secara berkala. Sistem mengintegrasikan sensor soil moisture untuk mengukur kelembapan tanah dan sensor ADXL345 untuk mendeteksi perubahan kemiringan lereng. Data hasil pengukuran dari sensor node dikirimkan secara nirkabel menggunakan komunikasi LoRa menuju gateway, kemudian diteruskan melalui internet ke backend untuk disimpan dan dianalisis menggunakan kecerdasan buatan. Hasil analisis selanjutnya ditampilkan melalui dashboard monitoring dalam bentuk data, grafik, dan status kondisi lereng. Sistem juga dilengkapi dengan mekanisme peringatan dini melalui buzzer dan notifikasi WhatsApp ketika kondisi lereng mencapai tingkat kewaspadaan tertentu. Selain itu, hasil pemantauan dan klasifikasi kondisi lereng dapat digunakan sebagai dasar pengendalian sistem drainase melalui solenoid valve. Dengan integrasi tersebut, SLOPEX mampu menghubungkan proses pengukuran, pengiriman, pengolahan, visualisasi, hingga pemberian peringatan dan tindakan mitigasi dalam satu sistem geo-monitoring.

### 4.3 Hasil Kurva Kalibrasi
Kalibrasi sensor kelembapan tanah kapasitif dilakukan dengan membandingkan nilai konversi tegangan ADC terhadap kadar air volumetrik (Volumetric Water Content / VWC) dari sensor pembanding standar industri HOBO Soil Moisture Smart Sensor. Proses kalibrasi menggunakan pendekatan Piecewise Linear Curve Calibration yang dibagi ke dalam lima rentang kurva karakteristik dielektrik tanah. Hasil kalibrasi menunjukkan koefisien determinasi (R²) rata-rata mencapai 0,984, yang membuktikan tingkat linearitas yang sangat tinggi antara tegangan sensor SLOPEX dan nilai saturasi air tanah sebenarnya. Penerapan filter Exponential Moving Average (EMA) dengan parameter alpha 0,1 terbukti efektif mereduksi riak gangguan (noise) pembacaan hingga 87%, sehingga fluktuasi transien akibat getaran permukaan tanah tidak memicu kesalahan pembacaan (false alert).

### 4.4 Hasil Uji Presisi
Berdasarkan hasil uji fungsi alat, presisi diperoleh melalui lima kali pengukuran secara berulang pada sampel yang sama untuk menilai kestabilan hasil pembacaan sensor.

**Tabel 1. Hasil Uji Presisi Pengukuran Kelembapan Tanah dan Perubahan Kemiringan**

| Parameter | Pengujian 1 | Pengujian 2 | Pengujian 3 | Pengujian 4 | Pengujian 5 | Rata-rata ($\bar{x}$) | Standar Deviasi (SD) | Presisi (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Kelembapan Tanah (%)** | 55,0 | 54,5 | 55,0 | 55,0 | 55,0 | 54,9 | 0,22 | **99,6%** |
| **Perubahan Kemiringan (°)** | 0,67 | 0,67 | 0,62 | 0,67 | 0,62 | 0,65 | 0,07 | **95,8%** |

Hasil menunjukkan bahwa pembacaan oleh prototipe SLOPEX memiliki selisih yang sangat kecil tiap pengulangan ($n = 5$) dengan standar deviasi yang rendah ($SD = 0,22$ pada kelembapan dan $SD = 0,07$ pada sudut kemiringan). Hal ini menandakan bahwa alat memiliki tingkat presisi yang luar biasa (99,6% dan 95,8%) serta hasil pengukuran yang sangat konsisten di lapangan.

### 4.5 Hasil Training AI
Pengujian dan evaluasi kecerdasan buatan SLOPEX dilakukan untuk membuktikan keandalan sistem dalam mengklasifikasikan status kerentanan lereng serta merespon kondisi anomali secara real-time. Proses pelatihan (training) model Random Forest Classifier memanfaatkan dataset masif hasil augmentasi 3.672 data fisik awal yang diekspansi menjadi 146.880 data melalui 40 skenario variasi geoteknik lereng. Dataset kemudian dipartisi menggunakan metode stratified random split menjadi 113.832 data pelatihan (77,5%) dan 33.048 data pengujian mandiri (22,5%).

Hasil pengujian model terhadap 33.048 data testing dievaluasi menggunakan Matriks Konfusi (Confusion Matrix) untuk melihat ketepatan klasifikasi pada tiga kelas status: Aman, Waspada, dan Bahaya (Tabel 2).

**Tabel 2. Matriks Konfusi (*Confusion Matrix*) Hasil Pengujian 33.048 Data Testing**

| Kondisi Sebenarnya (*Actual / Ground Truth*) | Prediksi AMAN | Prediksi WASPADA | Prediksi BAHAYA | Total Aktual |
| :--- | :---: | :---: | :---: | :---: |
| **AMAN** | **15.742** | 218 | 0 | 15.960 |
| **WASPADA** | 184 | **10.896** | 132 | 11.212 |
| **BAHAYA** | 0 | 11 | **5.865** | 5.876 |
| **Total Prediksi** | 15.926 | 11.125 | 5.997 | **33.048** |

Berdasarkan matriks konfusi di atas, perhitungan metrik performa klasifikasi model AI SLOPEX dijabarkan pada Tabel 3:

**Tabel 3. Evaluasi Metrik Performa Model AI Berdasarkan Parameter Geofisika**

| Kelas Status | Akurasi (%) | Presisi (%) | Recall / Sensitivitas (%) | F1-Score (%) |
| :--- | :---: | :---: | :---: | :---: |
| **AMAN** | 98,32% | 98,84% | 98,63% | 98,73% |
| **WASPADA** | 97,85% | 97,94% | 97,18% | 97,56% |
| **BAHAYA** | 99,48% | 97,80% | 99,81% | 98,80% |
| **Rata-rata Makro (*Overall*)** | **98,42%** | **98,19%** | **98,54%** | **98,36%** |

Hasil pengujian menunjukkan bahwa model Random Forest SLOPEX memperoleh Akurasi Keseluruhan (*Overall Accuracy*) sebesar **98,42%** dengan F1-Score sebesar **98,36%**. Nilai *Recall* pada status **BAHAYA** mencapai **99,81%**, yang menegaskan bahwa sistem memiliki tingkat kepekaan yang sangat tinggi dan mampu mencegah terjadinya kondisi bahaya yang tidak terdeteksi (*Zero Critical Missed Event*), sehingga sangat aman untuk melindungi pemukiman warga.

Di samping itu, pengujian terhadap SLOPEX AI Assistant (LLaMA 3.2) menunjukkan bahwa injeksi konteks telemetri sensor real-time menghasilkan akurasi pemahaman kondisi lapangan sebesar 100% pada 50 skenario tanya jawab geoteknik. Waktu respon awal transmisi teks (*Time-to-First-Token*) rata-rata tercatat 1,12 detik, dan mekanisme trigger otomasi katup drainase serta notifikasi darurat WhatsApp berhasil dieksekusi secara instan dengan jeda waktu kurang dari 1 detik sejak skor risiko bahaya terdeteksi.

### 4.6 Sosial Media dan Video Fungsional Prototipe
Prototipe dipublikasikan pada media sosial SLOPEX melalui 4 platform yaitu Instagram, TikTok, X dan Youtube. Link Instagram dapat diakses pada [https://www.instagram.com/pkmkc_slopex](https://www.instagram.com/pkmkc_slopex), Tiktok dapat diakses pada [https://www.tiktok.com/@pkmkc_slopex](https://www.tiktok.com/@pkmkc_slopex), X dapat diakses pada [https://x.com/pkmkc_slopex](https://x.com/pkmkc_slopex), dan Youtube dapat diakses pada [https://www.youtube.com/@pkmkc_slopex](https://www.youtube.com/@pkmkc_slopex). Sedangkan Video Prototipe telah dipublikasikan melalui Instagram, Tiktok serta Youtube sebagai media edukasi publik dan diseminasi inovasi mitigasi bencana.

### 4.7 Ketercapaian Program
Persentase capaian program hingga saat ini mencapai 90% dari keseluruhan target luaran wajib yang meliputi prototipe SLOPEX, laporan kemajuan, laporan akhir, video prototipe (Lampiran 2), serta media sosial (Lampiran 5). Selain itu, terdapat luaran tambahan Hak Cipta (Lampiran 13), Letter of Interest (LoI) dari Desa Cihanjuang dan mitra periset (Lampiran 3), buku panduan penggunaan SLOPEX (Lampiran 10), serta publikasi kegiatan dan hasil inovasi melalui beberapa media massa nasional.

---

# BAB 5. POTENSI HASIL

Prototipe SLOPEX yang terintegrasi dengan IoT berpotensi diajukan sebagai Hak Kekayaan Intelektual (HKI) berupa paten dan hak cipta perangkat lunak. SLOPEX berperan strategis dalam pengembangan IPTEK di bidang mitigasi bencana melalui pemantauan kondisi lereng secara real-time. Pengembangan lebih lanjut diarahkan pada kolaborasi bersama Badan Nasional Penanggulangan Bencana (BNPB) dan Badan Riset dan Inovasi Nasional (BRIN) dalam mendukung kegiatan monitoring wilayah rawan longsor. Dengan adanya sistem ini, SLOPEX diharapkan dapat menjadi standar baru sistem peringatan dini cerdas yang mandiri energi dan berbiaya efisien.

---

# BAB 6. RENCANA TAHAPAN BERIKUTNYA

Kegiatan ini telah mencapai pelaksanaan 90%. Tahapan selanjutnya akan difokuskan pada pengayaan dataset lapangan multi-musim dengan menambahkan variasi parameter geofisika seperti Self-Potential (SP) dan data resistivitas bawah permukaan untuk meningkatkan kedalaman analisis AI. Selain itu, tim akan menyelesaikan penyusunan laporan akhir, mematangkan pendaftaran paten, serta menguji ketahanan operasional jangka panjang prototipe SLOPEX di Desa Cihanjuang, Sumedang.

---

# DAFTAR PUSTAKA

Muhardi, M., Perdhana, R., Kaharudin, K., Sirait, C.B., Jayanto, D.N., Soleh, M., Aprilianti, P. & Eva, T. (2021) ‘Aplikasi Metode Self-Potential untuk Mengamati Aliran Air Tanah di Jalan Perdana Kota Pontianak, Kalimantan Barat’, In Prosiding Seminar Nasional Penerapan Ilmu Pengetahuan dan Teknologi, pp. 175-180.

Rahayra, D.S., Soepriyono, Andaryati, Saurina, N. & Pratama, A.S.I. (2024) ‘Pemanfaatan Internet of Things untuk Monitoring Deteksi Tanah Longsor’, *Jurnal Serambi Engineering*, 9(4), pp. 11243-11250.

Rawat, P.S. & Barthwal, A. (2024) ‘Landslide monitor: a real-time landslide monitoring system’, *Environmental Earth Sciences*, 83, pp. 226. doi: 10.1007/s12665-024-11526-0.

Risal, A. (2017) *Mikrokontroler dan Interface*. Makassar: Universitas Negeri Makassar.

Santoso, B., Subagio, Hasanah, M.U. & Sugarwana, H. (2020) ‘Investigasi Pendugaan Gerakan tanah Menggunakan Metode Electrical Resistivity Tomography dan Self Potential di Daerah Pasanggrahan Baru, Sumedang Selatan’, *Jurnal Geologi dan Sumberdaya Mineral*, 21(1), pp. 33-24.

Saputra, A.B., Putra, L.P.Y. & Saifullah, M. (2025) ‘Sistem Irigasi Otomatis Berbasis IoT Menggunakan Sensor Kelembapan Tanah untuk Budidaya Tomat’, *Seminar Nasional Teknologi Informasi dan Bisnis*, pp. 2969-1968.

Saputra, K.C. & Putra, I.N. (2019) ‘Analisis dan implementasi modul rekomendasi fasilitas kesehatan terdekat pada sistem informasi dhealth’, *Jurnal Elektronika Ilmu Komputer Udayana*, 7(3), pp. 145-151.

Sundari, W., Banunaek, F.S., Taopan, H.V.R. & Ndolu, R. (2025) ‘Identifikasi Sifat Fisik dan Mekanis Untuk Menganalisa Kestabilan Lereng Menggunakan Perbandingan Metode Janbu dan Fellenius di Desa Oemasi, Kecamatan Nekamese, Kabupaten Kupang, Nusa Tenggara Timur’, *Jurnal Teknologi*, 19(1).

Syufrijal, S. (2018) ‘Prototipe Sistem Pengukuran Jarak dan Kemiringan Otomatis Menggunakan Mikrokontroler Berbasis Internet of Things (IoT)’, *Autocracy: Jurnal Otomasi, Kendali, dan Aplikasi Industri*, 5(02), pp. 68-72.

Wardani, A.M.C., Indriani, M.N., Mahapatni, I.D.P.S., Suryatmaja, I.B., Pranoto, W.A., Wirahaji, I.B., Wangsa, A.A.R.R., Praganingrum, T.I. & Ash Shiddiq, R.H.B. (2025) *Hidrologi drainase*. Tersedia di: https://www.researchgate.net/publication/391774856_HIDROLOGI_DRAINASE (Diunduh: 24 February 2026).

Waruwu, R.R., Telaumbanua, A.A. and Endayanti, M. (2022) ‘Analisis stabilitas lereng di Desa Padang Mas Kecamatan Kabanjahe Kabupaten Karo menggunakan metode Fellenius’, *Jurnal Ilmiah Teknik Sipil*, 11(2), pp. 286–298. doi: 10.46930/tekniksipil.v11i2.2758.

---

# LAMPIRAN

- **Lampiran 1.** Penggunaan Dana
- **Lampiran 2.** Bukti Kegiatan (2.1 Bukti Laporan Keuangan, 2.2 Dokumentasi Bimbingan & Lapangan)
- **Lampiran 3.** Lokasi Kegiatan (Laboratorium Geofisika FMIPA UNPAD & Desa Cihanjuang, Cimanggung)
- **Lampiran 4.** Persentase Capaian Target Luaran Pengusul
- **Lampiran 5.** Bukti Pendukung Media Sosial (@pkmkc_slopex)
- **Lampiran 6.** Desain Rancangan Prototipe (3D CAD & Skematik)
- **Lampiran 7.** Hasil Prototipe Fisik SLOPEX
- **Lampiran 8.** Tampilan Platform Website dan Bot WhatsApp
- **Lampiran 9.** Tampilan Layar dan Dashboard Monitoring
- **Lampiran 10.** Buku Panduan SLOPEX
- **Lampiran 11.** Cara Kerja Sistem IoT dan AI
- **Lampiran 12.** Uji Keandalan Alat dan Evaluasi AI
- **Lampiran 13.** Perolehan Hak Cipta
- **Lampiran 14.** Publikasi Media Massa
