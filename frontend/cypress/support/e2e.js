// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for testing
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  return cy.wrap(subject).trigger('keydown', { keyCode: 9 })
})

// Custom command for accessibility testing
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe()
  cy.checkA11y()
})

// Custom command for waiting for audio to load
Cypress.Commands.add('waitForAudio', (audioSelector) => {
  cy.get(audioSelector).should(($audio) => {
    expect($audio[0].readyState).to.be.at.least(2)
  })
})

// Handle uncaught exceptions in tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore specific errors that are expected in testing
  if (err.message.includes('ResizeObserver')) {
    return false
  }
  if (err.message.includes('MediaRecorder')) {
    return false
  }
  return true
})
