// Frontend JavaScript for Financial Advisor

const questionForm = document.getElementById('questionForm');
const questionInput = document.getElementById('question');
const submitBtn = document.getElementById('submitBtn');
const resultsSection = document.getElementById('resultsSection');
const loadingState = document.getElementById('loadingState');
const answerOutput = document.getElementById('answerOutput');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const questionAsked = document.getElementById('questionAsked');
const closeResults = document.getElementById('closeResults');

// API endpoint
const API_URL = 'http://localhost:8000/api/ask';

// Handle form submission
questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const question = questionInput.value.trim();
    const age = document.getElementById('age').value;
    const monthlySalary = document.getElementById('monthlySalary').value;
    const riskAppetite = document.getElementById('riskAppetite').value;
    
    if (!question) {
        alert('Please enter a question');
        return;
    }
    
    // Show results section
    resultsSection.style.display = 'block';
    
    // Show question asked
    questionAsked.innerHTML = `
        <div class="question-display">
            <strong>Your Question:</strong>
            <p>${escapeHtml(question)}</p>
        </div>
    `;
    
    // Show loading, hide answer and error
    loadingState.style.display = 'block';
    answerOutput.innerHTML = '';
    errorState.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('question', question);
        if (age) formData.append('age', age);
        if (monthlySalary) formData.append('monthly_salary', monthlySalary);
        if (riskAppetite) formData.append('risk_appetite', riskAppetite);
        
        // Make API call
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Display answer
            displayAnswer(data.answer);
        } else {
            const errorMsg = data.message || data.error_details || 'Failed to get answer';
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        showError(error.message || 'Failed to connect to server. Make sure the backend is running on port 8000.');
    } finally {
        loadingState.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Ask Question';
    }
});

// Display answer with proper markdown rendering
function displayAnswer(answerText) {
    // Extract sources separately
    const { mainText, sourcesText } = extractSourcesSection(answerText);
    
    let html = '<div class="answer-container">';
    
    // Split into lines for processing
    const lines = mainText.split('\n');
    
    let inTable = false;
    let tableRows = [];
    let tableHeaders = [];
    let currentSection = '';
    let inCodeBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmedLine = line.trim();
        
        // Skip empty lines (but add spacing later)
        if (!trimmedLine && !inTable) {
            continue;
        }
        
        // Handle code blocks
        if (trimmedLine.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        
        if (inCodeBlock) {
            html += `<div class="code-line">${escapeHtml(line)}</div>`;
            continue;
        }
        
        // Detect section headers
        if (trimmedLine.match(/^#{1,3}\s+/) || trimmedLine.match(/^[A-Z][A-Z\s]+$/)) {
            // Close any open table
            if (inTable) {
                html += formatTable(tableHeaders, tableRows);
                tableRows = [];
                tableHeaders = [];
                inTable = false;
            }
            
            // Close previous section
            if (currentSection) {
                html += '</div>';
            }
            
            // Create new section
            const headerText = trimmedLine.replace(/^#{1,3}\s+/, '').replace(/^\*\*|\*\*$/g, '');
            currentSection = headerText;
            
            const level = trimmedLine.match(/^#+/)?.[0]?.length || 2;
            html += `<div class="answer-section">
                <h${Math.min(level, 3)} class="section-header">
                    ${formatText(headerText)}
                </h${Math.min(level, 3)}>`;
            continue;
        }
        
        // Detect tables (lines with |)
        if (trimmedLine.includes('|') && !trimmedLine.match(/^```/)) {
            // Close section if we were in one
            if (currentSection && !inTable) {
                html += '<div class="section-content">';
            }
            
            if (!inTable) {
                inTable = true;
                tableRows = [];
                tableHeaders = [];
            }
            
            // Skip separator rows
            if (trimmedLine.match(/^[-|:]+$/)) {
                continue;
            }
            
            const cells = trimmedLine.split('|')
                .map(c => c.trim())
                .filter(c => c && !c.match(/^[-:]+$/));
            
            // First non-separator row with | is likely headers
            if (tableRows.length === 0 && cells.length > 0) {
                tableHeaders = cells;
            } else if (cells.length > 0) {
                tableRows.push(cells);
            }
            continue;
        }
        
        // Close table if we were in one
        if (inTable) {
            html += formatTable(tableHeaders, tableRows);
            tableRows = [];
            tableHeaders = [];
            inTable = false;
            
            if (currentSection) {
                html += '</div>'; // Close section content
            }
        }
        
        // Lists
        if (trimmedLine.match(/^[-*•]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
            if (currentSection && !inTable) {
                html += '<div class="section-content">';
            }
            
            const listItem = trimmedLine.replace(/^[-*•\d.\s]+/, '');
            const icon = '<i class="fas fa-circle"></i>';
            html += `<div class="list-item">${icon} ${formatText(listItem)}</div>`;
            continue;
        }
        
        // Bold text (markdown style)
        if (trimmedLine.includes('**')) {
            if (currentSection && !inTable) {
                html += '<div class="section-content">';
            }
            html += `<p class="answer-paragraph bold-text">${formatText(trimmedLine)}</p>`;
            continue;
        }
        
        // Regular paragraphs
        if (trimmedLine.length > 0) {
            // Skip source sections (already handled separately)
            if (trimmedLine.match(/^(Sources?|References?):/i)) {
                continue;
            }
            
            if (currentSection && !inTable) {
                html += '<div class="section-content">';
            }
            
            html += `<p class="answer-paragraph">${formatText(trimmedLine)}</p>`;
        }
    }
    
    // Close any open table
    if (inTable) {
        html += formatTable(tableHeaders, tableRows);
    }
    
    // Close last section
    if (currentSection) {
        html += '</div></div>';
    }
    
    // Add sources section if present
    if (sourcesText) {
        html += '<div class="sources-section">';
        html += '<h3 class="sources-header"><i class="fas fa-link"></i> Sources</h3>';
        const sourceLines = sourcesText.split('\n').filter(line => line.trim());
        html += '<ul class="sources-list">';
        for (let sourceLine of sourceLines) {
            // Extract URLs and format as links
            const urlPattern = /(https?:\/\/[^\s]+)/g;
            let formattedSource = escapeHtml(sourceLine.trim());
            formattedSource = formattedSource.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
            if (formattedSource) {
                html += `<li>${formattedSource}</li>`;
            }
        }
        html += '</ul></div>';
    }
    
    html += '</div>';
    answerOutput.innerHTML = html;
    answerOutput.scrollTop = 0;
}

// Format table with proper HTML
function formatTable(headers, rows) {
    if (rows.length === 0 && headers.length === 0) {
        return '';
    }
    
    let html = '<div class="table-wrapper">';
    html += '<table class="financial-table">';
    
    // Headers
    if (headers.length > 0) {
        html += '<thead><tr>';
        for (let header of headers) {
            html += `<th>${formatText(header)}</th>`;
        }
        html += '</tr></thead>';
    }
    
    // Rows
    if (rows.length > 0) {
        html += '<tbody>';
        for (let row of rows) {
            html += '<tr>';
            for (let cell of row) {
                html += `<td>${formatText(cell)}</td>`;
            }
            // Fill empty cells if row is shorter than headers
            while (row.length < headers.length) {
                html += '<td></td>';
                row.push('');
            }
            html += '</tr>';
        }
        html += '</tbody>';
    }
    
    html += '</table></div>';
    return html;
}

// Extract and format sources section
function extractSourcesSection(text) {
    const sourcesPattern = /(?:^|\n)(Sources?|References?):?\s*\n/i;
    const match = text.match(sourcesPattern);
    if (match) {
        const index = text.indexOf(match[0]);
        const sourcesText = text.substring(index + match[0].length).trim();
        const mainText = text.substring(0, index).trim();
        return { mainText, sourcesText };
    }
    return { mainText: text, sourcesText: null };
}

// Format text (highlight numbers, currency, etc.)
function formatText(text) {
    // Escape HTML first
    text = escapeHtml(text);
    
    // Format bold text (**text**)
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Highlight currency (₹, Rs., INR) - handle crores, lakhs, etc.
    // Match patterns like: ₹ 2,05,600 crores or ₹2,05,600 or Rs. 37,400 crores
    text = text.replace(/(₹|Rs\.?|INR)\s*([\d,]+(?:\.[\d]+)?)\s*(crores?|lakhs?|thousand|Cr\.?|Lakh\.?|Cr)?/gi, 
        function(match, currency, amount, unit) {
            let displayText = currency + ' ' + amount;
            if (unit && unit.trim()) {
                displayText += ' ' + unit.trim();
            }
            return '<span class="currency-value">' + displayText + '</span>';
        });
    
    // Highlight percentages
    text = text.replace(/([\d.]+%)/g, '<span class="percentage-value">$1</span>');
    
    // Highlight stock symbols (e.g., RELIANCE.NS, TCS.NS)
    text = text.replace(/\b([A-Z]{2,}\.(?:NS|BO))\b/g, '<span class="stock-symbol">$1</span>');
    
    // Highlight numbers in parentheses (like price targets)
    text = text.replace(/\(([\d,]+(?:\.[\d]+)?)\)/g, '<span class="number-value">($1)</span>');
    
    return text;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error
function showError(message) {
    errorMessage.textContent = message;
    errorState.style.display = 'block';
}

// Close results
closeResults.addEventListener('click', () => {
    resultsSection.style.display = 'none';
});

// Check API health on load
async function checkAPIHealth() {
    try {
        const response = await fetch('http://localhost:8000/api/health');
        if (response.ok) {
            console.log('API is healthy');
        }
    } catch (error) {
        console.warn('API health check failed:', error);
    }
}

// Check on page load
checkAPIHealth();
