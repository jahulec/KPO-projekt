document.getElementById("generate").addEventListener("click", function() {
    const role = document.getElementById("role").value;
    const style = document.getElementById("style").value;
    const portfolio = document.getElementById("portfolio").checked;
    const concerts = document.getElementById("concerts").checked;
    const shop = document.getElementById("shop").checked;
    const bio = document.getElementById("bio").checked;

    let previewContent = `<h1>Podgląd strony dla ${role}</h1>`;
    
    // Generowanie sekcji na podstawie wyborów
    if (portfolio) previewContent += `<div><h2>Portfolio</h2><p>Tu będą zdjęcia i projekty artysty.</p></div>`;
    if (concerts) previewContent += `<div><h2>Kalendarz Koncertów</h2><p>Lista nadchodzących koncertów.</p></div>`;
    if (shop) previewContent += `<div><h2>Sklep</h2><p>Zakupy artystyczne i produkty związane z artystą.</p></div>`;
    if (bio) previewContent += `<div><h2>Biografia</h2><p>Informacje o artyście.</p></div>`;

    document.getElementById("preview-container").innerHTML = previewContent;
});
