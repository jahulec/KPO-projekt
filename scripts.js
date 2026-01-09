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
    
    let previewContent = `<h1>Podgląd strony dla ${role}</h1>`;
    
    // Generowanie sekcji na podstawie wyborów
    if (portfolio) previewContent += `<div><h2>Portfolio</h2><p>Tu będą zdjęcia i projekty artysty.</p></div>`;
    if (concerts) previewContent += `<div><h2>Kalendarz Koncertów</h2><p>Lista nadchodzących koncertów.</p></div>`;
    if (shop) previewContent += `<div><h2>Sklep</h2><p>Zakupy artystyczne i produkty związane z artystą.</p></div>`;
    if (bio) previewContent += `<div><h2>Biografia</h2><p>Informacje o artyście.</p></div>`;
    
    // Dodanie mediów społecznościowych
    if (instagram || facebook || twitter) {
        previewContent += `<h2>Media Społecznościowe</h2><ul>`;
        if (instagram) previewContent += `<li><a href="${instagram}" target="_blank">Instagram</a></li>`;
        if (facebook) previewContent += `<li><a href="${facebook}" target="_blank">Facebook</a></li>`;
        if (twitter) previewContent += `<li><a href="${twitter}" target="_blank">Twitter</a></li>`;
        previewContent += `</ul>`;
    }
    
    // Dodanie galerii zdjęć
    if (gallery.length > 0) {
        previewContent += `<h2>Galeria Zdjęć</h2><div class="gallery">`;
        for (let i = 0; i < gallery.length; i++) {
            let reader = new FileReader();
            reader.onload = function(e) {
                previewContent += `<img src="${e.target.result}" alt="Zdjęcie ${i+1}" class="gallery-image">`;
                if (i === gallery.length - 1) {
                    previewContent += `</div>`;
                    document.getElementById("preview-container").innerHTML = previewContent;
                }
            };
            reader.readAsDataURL(gallery[i]);
        }
    } else {
        document.getElementById("preview-container").innerHTML = previewContent;
    }

    // Dodanie muzyki
    if (music) {
        previewContent += `<h2>Muzyka</h2><audio controls><source src="${URL.createObjectURL(music)}" type="audio/mpeg">Twoja przeglądarka nie wspiera elementu audio.</audio>`;
    }

    // Formularz kontaktowy
    document.getElementById("contact-form").addEventListener("submit", function(event) {
        event.preventDefault();
        alert(`Wiadomość od ${name} (${email}):\n${message}`);
    });
});
