/**
 * Hiring Funnel Calculator — Google Apps Script
 *
 * Adds a "Hiring Funnel" menu to the spreadsheet.
 * The sidebar lets you model recruiter-screen volume,
 * pass-through rates, and weekly sourcing targets.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Hiring Funnel')
    .addItem('Open Calculator', 'showCalculator')
    .addToUi();
}

function showCalculator() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Hiring Funnel Calculator');
  SpreadsheetApp.getUi().showSidebar(html);
}
