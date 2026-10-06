# PROJECT VANTA

2–6 oyunculu, tarayıcıda çalışan 3D kooperatif soruşturma gerilim oyunu.

Ajan rehberi: [CLAUDE.md](CLAUDE.md) · Oturum komutları: [Docs/OTURUM_KOMUTLARI.md](Docs/OTURUM_KOMUTLARI.md)

## Arkadaşlarla oynamak

`pnpm dev` istemciyi tüm ağ arayüzlerinde **5173** portundan açar; oyun sunucusu trafiği de aynı porttan (`/colyseus`) geçer. Dışarıya yalnızca **5173** açılması yeterlidir.

- **Aynı ağ (LAN):** Terminaldeki `Network: http://192.168.x.x:5173/` adresini ve oda linkindeki `#ODAKODU` kısmını paylaşın. Windows güvenlik duvarı sorarsa Node.js için "Özel ağlar"a izin verin.
- **İnternet:** Modemde TCP **5173** portunu bilgisayarınıza yönlendirin ve `http://GENEL_IP:5173/#ODAKODU` paylaşın, ya da bir tünel kullanın (ör. `cloudflared tunnel --url http://localhost:5173`).

Bu bir geliştirme sunucusudur; yalnızca güvendiğiniz kişilerle test için açın.

## Kayıtlar

Kampanya ve karakterler `apps/server/saves/vanta.sqlite` dosyasına kaydedilir; sunucu yeniden başlasa da kaldığı yerden devam eder. Sıfırdan başlamak için sunucuyu durdurup `apps/server/saves/` klasörünü silin. Farklı bir dosya için `VANTA_DB=yol/dosya.sqlite pnpm dev`.
