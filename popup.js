chrome.storage.local.get(['usn', 'day', 'month', 'year', 'idType', 'last4'], (data) => {
    if (data.usn) {
        document.getElementById('usn').value = data.usn;
        document.getElementById('day').value = data.day;
        document.getElementById('month').value = data.month;
        document.getElementById('year').value = data.year;
    }
    if (data.idType) document.getElementById('idType').value = data.idType;
    if (data.last4) document.getElementById('last4').value = data.last4;
});

document.getElementById('save').addEventListener('click', () => {
    const details = {
        usn: document.getElementById('usn').value.trim(),
        day: document.getElementById('day').value.trim(),
        month: document.getElementById('month').value.trim(),
        year: document.getElementById('year').value.trim(),
        idType: document.getElementById('idType').value,
        last4: document.getElementById('last4').value.trim()
    };

    chrome.storage.local.set(details, () => {
        alert('Details saved! Refreshing the page...');
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.reload(tabs[0].id);
        });
    });
});
