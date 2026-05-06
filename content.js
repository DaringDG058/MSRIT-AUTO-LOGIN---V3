function simulateInput(element, value) {
    if (!element) return;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Upgraded extraction: Checks text labels first, falls back to progress bar attributes
function getAttendanceData() {
    let present = 0, absent = 0, stillToGo = 0;
    let found = false;

    // Method 1: Check the legend texts (e.g., "Present[32]")
    const presentEl = document.querySelector('.cn-attend');
    const absentEl = document.querySelector('.cn-absent');
    const stillEl = document.querySelector('.cn-still');

    if (presentEl && absentEl && stillEl) {
        const pMatch = presentEl.innerText.match(/\[(\d+)\]/);
        const aMatch = absentEl.innerText.match(/\[(\d+)\]/);
        const sMatch = stillEl.innerText.match(/\[(\d+)\]/);

        if (pMatch && aMatch && sMatch) {
            present = parseInt(pMatch[1], 10);
            absent = parseInt(aMatch[1], 10);
            stillToGo = parseInt(sMatch[1], 10);
            found = true;
        }
    }

    // Method 2: Check the progress bars (Fallback)
    if (!found) {
        const pBar = document.querySelector('.sc-progress-bar.md-bg-green-400');
        const aBar = document.querySelector('.sc-progress-bar.md-bg-red-400');
        const sBar = document.querySelector('.sc-progress-bar.md-bg-grey-400');

        if (pBar && aBar && sBar) {
            const pMatch = pBar.getAttribute('title')?.match(/Present:(\d+)/i);
            const aMatch = aBar.getAttribute('title')?.match(/Absent:(\d+)/i);
            const sMatch = sBar.getAttribute('title')?.match(/Still to go:(\d+)/i);

            if (pMatch && aMatch && sMatch) {
                present = parseInt(pMatch[1], 10);
                absent = parseInt(aMatch[1], 10);
                stillToGo = parseInt(sMatch[1], 10);
                found = true;
            }
        }
    }

    return found ? { present, absent, stillToGo } : null;
}

let lastCalculatedSubject = "";

function runMSRITLogic(data) {
    const failureModal = document.getElementById('myloginModal');
    if (failureModal && (failureModal.style.display === "block" || document.body.innerText.includes("Login Failed"))) {
        console.error("MSRIT Pro: Login Failed detected. Stopping to prevent lockout.");
        clearInterval(window.mainInterval);
        return;
    }

    const u = document.getElementById('username');
    const d = document.getElementById('dd');
    const m = document.getElementById('mm');
    const y = document.getElementById('yyyy');
    const loginBtn = document.querySelector('.cn-login-btn');

    if (u && loginBtn && u.value === "" && data.usn) {
        simulateInput(u, data.usn);
        simulateInput(d, data.day + ' ');
        simulateInput(m, data.month);
        simulateInput(y, data.year);

        if (typeof putdate === "function") putdate();

        console.log("MSRIT Pro: Filling details and logging in...");
        loginBtn.click();
    }

    const openModals = document.querySelectorAll('.uk-modal.uk-open');
    if (openModals.length > 0) {
        openModals.forEach(modal => {
            const closeBtn = modal.querySelector('.uk-modal-close');
            const fallbackBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.trim().toUpperCase() === "CLOSE");
            const targetBtn = closeBtn || fallbackBtn;

            if (targetBtn) {
                console.log("MSRIT Pro: Auto-closing attendance warning...");
                targetBtn.click();
            }
        });
    }

    // REMOVED explicit URL check. We now dynamically check if the DOM contains the stats.
    const stats = getAttendanceData();
    
    if (stats) {
        const currentSubject = document.querySelector('li.uk-active a')?.innerText || "default";
        
        if (lastCalculatedSubject !== currentSubject) {
            const oldBox = document.getElementById("msrit-bunk-calc-box");
            if (oldBox) oldBox.remove();
        }

        if (!document.getElementById("msrit-bunk-calc-box")) {
            lastCalculatedSubject = currentSubject;
            
            const { present, absent, stillToGo } = stats;
            const totalClasses = present + absent + stillToGo;
            const req85 = Math.ceil(0.85 * totalClasses);
            const req75 = Math.ceil(0.75 * totalClasses);
            const maxPossiblePresent = present + stillToGo;
            const currentPercent = totalClasses === 0 ? 0 : (present / totalClasses) * 100;

            let msg85 = "";
            let color85 = "";
            let msg75 = "";
            let color75 = "";

            if (stillToGo === 0) {
                if (currentPercent >= 85) {
                    msg85 = `Classes have ended. You successfully maintained at or above 85% attendance!`;
                    color85 = "#27AE61";
                } else {
                    msg85 = `Classes have ended. Your final attendance is below 85%.`;
                    color85 = "#b82226";
                }

                if (currentPercent >= 75) {
                    msg75 = `Classes have ended. You successfully maintained at or above 75% attendance!`;
                    color75 = "#27AE61";
                } else {
                    msg75 = `Classes have ended. Your final attendance is below 75%.`;
                    color75 = "#b82226";
                }
            } 
            else {
                const buffer85 = maxPossiblePresent - req85;
                if (buffer85 >= stillToGo) {
                    msg85 = `You can safely bunk all ${stillToGo} remaining classes and stay at or above 85%.`;
                    color85 = "#27AE61";
                } else if (buffer85 >= 0) {
                    msg85 = `You can safely bunk ${buffer85} out of the ${stillToGo} remaining classes and stay at or above 85%.`;
                    color85 = "#27AE61";
                } else {
                    msg85 = `You cannot reach 85%. Even if you attend all remaining, you'll be short by ${Math.abs(buffer85)} classes.`;
                    color85 = "#b82226";
                }

                const buffer75 = maxPossiblePresent - req75;
                if (buffer75 >= stillToGo) {
                    msg75 = `You can safely bunk all ${stillToGo} remaining classes and stay at or above 75%.`;
                    color75 = "#27AE61";
                } else if (buffer75 >= 0) {
                    msg75 = `You can safely bunk ${buffer75} out of the ${stillToGo} remaining classes and stay at or above 75%.`;
                    color75 = "#27AE61";
                } else {
                    msg75 = `You cannot reach 75%. Even if you attend all remaining, you'll be short by ${Math.abs(buffer75)} classes.`;
                    color75 = "#b82226";
                }
            }

            const calcBox = document.createElement("div");
            calcBox.id = "msrit-bunk-calc-box";
            calcBox.className = "uk-card uk-card-default uk-card-body uk-margin-top";
            calcBox.style.cssText = "border: 2px solid #b82226; border-radius: 8px; background-color: #fcfcfc; padding: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 20px;";
            
            calcBox.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <h3 style="color:#b82226; margin:0; font-weight:bold; font-size: 18px;">📉 Bunk Manager</h3>
                </div>
                <div style="font-size: 15px; line-height: 1.6;">
                    <div style="margin-bottom: 8px;">
                        <strong>85% Target:</strong> 
                        <span style="color: ${color85}; font-weight: 500;">${msg85}</span>
                    </div>
                    <div>
                        <strong>75% Target:</strong> 
                        <span style="color: ${color75}; font-weight: 500;">${msg75}</span>
                    </div>
                </div>
            `;

            const targetGrid = document.querySelector('.cn-att-stat')?.closest('.uk-grid');
            if (targetGrid) {
                targetGrid.insertAdjacentElement('afterend', calcBox);
            }
        }
    }
}

chrome.storage.local.get(['usn', 'day', 'month', 'year'], (data) => {
    if (!data.usn) {
        const banner = document.createElement('div');
        banner.style = "position:fixed;top:0;width:100%;background:#b82226;color:white;text-align:center;z-index:9999;padding:15px;font-weight:bold;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,0.3);";
        banner.innerHTML = "MSRIT Pro: Click the Extension Icon in your browser bar to save your USN and DOB!";
        document.body.prepend(banner);
    } else {
        window.mainInterval = setInterval(() => runMSRITLogic(data), 500);
    }
});
