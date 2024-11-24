/* Load the tags */
const filePath = chrome.runtime.getURL("tags.json");

let tagDatabase = {};


fetch(filePath)
    .then(response => response.json())
    .then(data => {
        tagDatabase = data;
    })
    .catch(error => {
        console.error("Error loading tag database:", error);
    });

/* (tags.json is installed with extension) */

let tags = [];
let blacklistedTags = [];

const tagInput = document.getElementById('tagInput');
const addButton = document.getElementById('addButton');
const tagsContainer = document.getElementById('tagsContainer');
const searchButton = document.getElementById('searchButton');

const suggestionsContainer = document.createElement('div');
suggestionsContainer.className = 'suggestions-container';
tagInput.parentNode.insertBefore(suggestionsContainer, tagInput.nextSibling);

function getCurrentInputSection() {
    const cursorPosition = tagInput.selectionStart;
    const inputValue = tagInput.value;
    const sections = inputValue.split(',');
    
    let currentPosition = 0;
    for (let i = 0; i < sections.length; i++) {
        currentPosition += sections[i].length + 1;
        if (cursorPosition <= currentPosition) {
            return {
                text: sections[i].trim(),
                sectionIndex: i,
                startPosition: currentPosition - sections[i].length - 1,
                endPosition: currentPosition - 1
            };
        }
    }
    
    return {
        text: sections[sections.length - 1].trim(),
        sectionIndex: sections.length - 1,
        startPosition: inputValue.lastIndexOf(',') + 1,
        endPosition: inputValue.length
    };
}

function getSuggestions(input) {
    if (!input) return [];

    input = input.toLowerCase();

    const matches = Object.entries(tagDatabase)
        .filter(([tag]) => tag.toLowerCase().includes(input))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    return matches;
}

function showSuggestions(suggestions, sectionInfo) {
    suggestionsContainer.innerHTML = '';

    if (suggestions.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }

    suggestions.forEach(([tag, value]) => {
        const div = document.createElement('div');
        div.className = 'suggestion';
        div.innerHTML = `
            <span class="suggestion-text">${tag}</span>
            <span class="suggestion-value">(${value})</span>
        `;

        div.addEventListener('click', () => {

            const sections = tagInput.value.split(',');

            sections[sectionInfo.sectionIndex] = tag;
            tagInput.value = sections.join(',');
            
            if (sectionInfo.sectionIndex === sections.length - 1) {
                tagInput.value += ', ';
            }
            
            tagInput.focus();
            suggestionsContainer.style.display = 'none';
        });

        suggestionsContainer.appendChild(div);
    });

    suggestionsContainer.style.display = 'block';
}

chrome.storage.local.get(['savedTags'], function (result) {
    if (result.savedTags) {
        tags = result.savedTags;
        renderTags();
    }
});

function saveTags() {
    chrome.storage.local.set({ savedTags: tags });
}

function createTagElement(tagText) {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';

    const textNode = document.createTextNode(tagText);
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';

    closeButton.addEventListener('click', () => {
        e.stopPropagation();
        removeTag(tagText);
    });

    tagElement.addEventListener('click', () => {
        toggleBlacklistTag(tagElement, tagText);
    });

    tagElement.appendChild(textNode);
    tagElement.appendChild(closeButton);

    return tagElement;
}

function addTag(tagText) {
    tagText = tagText.trim().toLowerCase();
    if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
        renderTags();
        saveTags();
    }
}

function removeTag(tagText) {
    const index = tags.indexOf(tagText);
    if (index > -1) {
        tags.splice(index, 1);
        renderTags();
        saveTags();
    }
}

function renderTags() {
    tagsContainer.innerHTML = '';
    tags.forEach(tag => {
        tagsContainer.appendChild(createTagElement(tag));
    });
}

tagInput.addEventListener('input', (e) => {
    const sectionInfo = getCurrentInputSection();
    const suggestions = getSuggestions(sectionInfo.text);
    showSuggestions(suggestions, sectionInfo);
});

document.addEventListener('click', (e) => {
    if (!suggestionsContainer.contains(e.target) && e.target !== tagInput) {
        suggestionsContainer.style.display = 'none';
    }
});

addButton.addEventListener('click', () => {
    const tagTexts = tagInput.value.split(',');
    tagTexts.forEach(tag => addTag(tag));
    tagInput.value = '';
    suggestionsContainer.style.display = 'none';
});

tagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const tagTexts = tagInput.value.split(',');
        tagTexts.forEach(tag => addTag(tag));
        tagInput.value = '';
        suggestionsContainer.style.display = 'none';
    }
});

searchButton.addEventListener('click', () => {
    if (tags.length > 0) {
        const whitelistTags = tags.filter(tag => !blacklistedTags.includes(tag));
        const blacklistTags = blacklistedTags;

        const searchParams = [
            ...whitelistTags.map(tag => `%23${tag}`),
            ...blacklistTags.map(tag => `-${tag}`)
        ].join('%20');

        const searchUrl = `https://www.wattpad.com/search/${searchParams}`;
        window.open(searchUrl, '_blank');
    }
});

function clearAllTags() {
    tags = [];
    renderTags();
    saveTags();
}

document.getElementById('clearButton').addEventListener('click', () => {
    clearAllTags();
});

function toggleBlacklistTag(tagElement, tagText) {
    if (blacklistedTags.includes(tagText)) {
        // Remove from blacklist
        blacklistedTags = blacklistedTags.filter(tag => tag !== tagText);
        tagElement.classList.remove('blacklisted');
    } else {
        // Add to blacklist
        blacklistedTags.push(tagText);
        tagElement.classList.add('blacklisted');
    }
}
