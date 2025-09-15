// Custom commands for Cypress testing

Cypress.Commands.add('getBySel', (selector, ...args) => {
  return cy.get(`[data-testid="${selector}"]`, ...args)
})

Cypress.Commands.add('getBySelLike', (selector, ...args) => {
  return cy.get(`[data-testid*="${selector}"]`, ...args)
})

// Command to upload file with better error handling
Cypress.Commands.add('uploadFile', (fileName, fileType = 'audio/wav') => {
  cy.get('input[type="file"]').selectFile({
    contents: Cypress.Buffer.from('fake audio data'),
    fileName: fileName,
    mimeType: fileType,
  }, { force: true })
})

// Command to mock successful transcription
Cypress.Commands.add('mockSuccessfulTranscription', (transcription = 'Test transcription') => {
  cy.intercept('POST', '**/transcribe', {
    statusCode: 200,
    body: { job_id: 'test-job-123' }
  }).as('transcribe')

  cy.intercept('GET', '**/job-status/test-job-123', {
    statusCode: 200,
    body: {
      status: 'completed',
      result: {
        transcription: transcription,
        pronunciation_analysis: {
          words: transcription.split(' ').map(word => ({
            word: word,
            pronunciation_accuracy: Math.random() * 0.3 + 0.7,
            is_mispronounced: Math.random() < 0.3
          }))
        }
      }
    }
  }).as('jobStatus')
})

// Command to check toast notifications
Cypress.Commands.add('shouldShowToast', (message) => {
  cy.get('.Toastify__toast').should('contain', message)
})
