document.getElementById("generate").addEventListener("click", function() {
    const role = document.getElementById("role").value;
    const style = document.getElementById("style").value;
    const portfolio = document.getElementById("portfolio").checked;
    const concerts = document.getElementById("concerts").checked;
    const shop = document.getElementById("shop").checked;
    const bio = document.getElementById("bio").checked;
    const instagram = document.getElementById("instagram").value;
    const facebook = document.getElementById("facebook").value;
    const twitter = document.getElementById("twitter").value;
    const gallery = document.getElementById("gallery").files;
    const music = document.getElementById("music").files[0];
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    let previewContent = `
        <header>
            <h1>Artysta: ${role}</h1>
        </header>
    `;

    previewContent += `<main><section>`;
    
    if (portfolio) previewContent += `<div><h3>Portfolio</h3><p>Tu będą zdjęcia i projekty artysty.</p></div>`;
    if (concerts) previewContent += `<div><h3>Kalendarz Koncertów</h3><p>Lista nadchodzących koncertów.</p></div>`;
    if (shop) previewContent += `<div><h3>Sklep</h3><p>Zakupy artystyczne i produkty związane z artystą.</p></div>`;
    if (bio) previewContent += `<div><h3>Biografia</h3><p>Informacje o artyście.</p></div>`;

    // Social Media Links
    if (instagram || facebook || twitter) {
        previewContent += `
            <div><h3>Media Społecznościowe</h3><ul class="social-media">
        `;
        if (instagram) previewContent += `<li><a href="${instagram}" target="_blank">Instagram</a></li>`;
        if (facebook) previewContent += `<li><a href="${facebook}" target="_blank">Facebook</a></li>`;
        if (twitter) previewContent += `<li><a href="${twitter}" target="_blank">Twitter</a></li>`;
        previewContent += `</ul></div>`;
    }

    // Gallery
    if (gallery.length > 0) {
        previewContent += `<div><h3>Galeria Zdjęć</h3><div class="gallery">`;
        for (let i = 0; i < gallery.length; i++) {
            let reader = new FileReader();
            reader.onload = function(e) {
                previewContent += `<img src="${e.target.result}" alt="Zdjęcie ${i+1}" class="gallery-image">`;
                if (i === gallery.length - 1) {
                    previewContent += `</div></div>`;
                    document.getElementById("preview-container").innerHTML = previewContent;
                }
            };
            reader.readAsDataURL(gallery[i]);
        }
    }

    // Music
    if (music) {
        previewContent += `<div><h3>Muzyka</h3><audio controls><source src="${URL.createObjectURL(music)}" type="audio/mpeg">Twoja przeglądarka nie wspiera elementu audio.</audio></div>`;
    }

    previewContent += `</section></main>`;
    previewContent += `<footer><p>&copy; 2026 Artysta | Wszystkie prawa zastrzeżone</p></footer>`;

    document.getElementById("preview-container").innerHTML = previewContent;
});
