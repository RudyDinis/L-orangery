//onload

async function refreshProfile() {
    const dot = document.querySelector(".dot");

    let data = await window.electronAPI.getHeadSkin();
    document.getElementById("profilePicture").src = data[0];
    document.getElementById("name").textContent = data[1];

    if (data[1] == "Déconnecté") {
        document.getElementById("status").textContent = "Hors ligne";
        dot.classList.add("red");
        dot.classList.remove("green");
    } else {
        document.getElementById("status").textContent = "En ligne";
        dot.classList.add("green");
        dot.classList.remove("red");
    }
}

refreshProfile();

//

const launch = document.getElementById('launch');

launch.addEventListener('click', async () => {
    await window.electronAPI.launch();
    refreshProfile();
});

document.getElementById('btn-min').addEventListener('click', () => window.windowControls.minimize());
document.getElementById('btn-close').addEventListener('click', () => window.windowControls.close());