describe('Speech-to-Text Application', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load the application successfully', () => {
    cy.contains('Speech-to-Text & Pronunciation Analysis')
    cy.get('[data-testid="upload-area"]').should('be.visible')
    cy.get('[data-testid="record-button"]').should('be.visible')
  })

  it('should display language selector', () => {
    cy.get('select').should('be.visible')
    cy.get('select option[value="en"]').should('exist')
    cy.get('select option[value="es"]').should('exist')
  })

  it('should handle file upload UI', () => {
    cy.get('[data-testid="upload-area"]').should('contain', 'Drag & drop audio files here')
    
    // Test drag and drop area styling
    cy.get('[data-testid="upload-area"]')
      .trigger('dragenter')
      .should('have.class', 'drag-over')
      
    cy.get('[data-testid="upload-area"]')
      .trigger('dragleave')
      .should('not.have.class', 'drag-over')
  })

  it('should show recording controls', () => {
    cy.get('[data-testid="record-button"]').click()
    
    // Should show recording state
    cy.get('[data-testid="record-button"]')
      .should('contain', 'Stop Recording')
      .and('have.class', 'recording')
    
    // Should show timer
    cy.get('[data-testid="timer"]').should('be.visible')
    
    // Stop recording
    cy.get('[data-testid="record-button"]').click()
    cy.get('[data-testid="record-button"]').should('contain', 'Start Recording')
  })

  describe('File Upload Flow', () => {
    it('should upload and process audio file', () => {
      // Mock successful API response
      cy.intercept('POST', '**/transcribe', {
        statusCode: 200,
        body: { job_id: 'test-job-123' }
      }).as('transcribeRequest')

      cy.intercept('GET', '**/job-status/test-job-123', {
        statusCode: 200,
        body: {
          status: 'completed',
          result: {
            transcription: 'Hello world',
            pronunciation_analysis: {
              words: [
                {
                  word: 'Hello',
                  pronunciation_accuracy: 0.95,
                  is_mispronounced: false
                },
                {
                  word: 'world',
                  pronunciation_accuracy: 0.85,
                  is_mispronounced: false
                }
              ]
            }
          }
        }
      }).as('jobStatus')

      // Upload file (simulate)
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-audio.wav', {
        force: true
      })

      cy.wait('@transcribeRequest')
      cy.wait('@jobStatus')

      // Check results display
      cy.get('[data-testid="transcription-result"]').should('contain', 'Hello world')
      cy.get('[data-testid="pronunciation-analysis"]').should('be.visible')
    })

    it('should handle API errors gracefully', () => {
      cy.intercept('POST', '**/transcribe', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('transcribeError')

      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-audio.wav', {
        force: true
      })

      cy.wait('@transcribeError')
      cy.get('[data-testid="error-message"]').should('contain', 'transcription failed')
    })
  })

  describe('Pronunciation Analysis', () => {
    beforeEach(() => {
      // Setup completed transcription with pronunciation analysis
      cy.intercept('GET', '**/job-status/**', {
        statusCode: 200,
        body: {
          status: 'completed',
          result: {
            transcription: 'Hello beautiful world',
            pronunciation_analysis: {
              words: [
                {
                  word: 'Hello',
                  pronunciation_accuracy: 0.95,
                  is_mispronounced: false
                },
                {
                  word: 'beautiful',
                  pronunciation_accuracy: 0.65,
                  is_mispronounced: true
                },
                {
                  word: 'world',
                  pronunciation_accuracy: 0.90,
                  is_mispronounced: false
                }
              ]
            }
          }
        }
      }).as('completedJob')

      // Mock file upload
      cy.intercept('POST', '**/transcribe', {
        statusCode: 200,
        body: { job_id: 'test-job-123' }
      }).as('transcribe')

      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-audio.wav', {
        force: true
      })
    })

    it('should highlight mispronounced words', () => {
      cy.wait('@completedJob')
      
      cy.get('[data-testid="word-beautiful"]')
        .should('have.class', 'mispronounced')
        .and('be.visible')
      
      cy.get('[data-testid="word-Hello"]')
        .should('not.have.class', 'mispronounced')
      
      cy.get('[data-testid="word-world"]')
        .should('not.have.class', 'mispronounced')
    })

    it('should play pronunciation audio when clicking mispronounced word', () => {
      cy.intercept('POST', '**/synthesize-speech', {
        statusCode: 200,
        headers: { 'content-type': 'audio/mpeg' },
        body: 'fake-audio-data'
      }).as('synthesizeAudio')

      cy.wait('@completedJob')
      
      cy.get('[data-testid="word-beautiful"]').click()
      cy.wait('@synthesizeAudio')
      
      // Should show audio feedback
      cy.get('[data-testid="audio-feedback"]').should('contain', 'Playing pronunciation')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-testid', 'language-select')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'upload-area')
      
      cy.focused().tab()
      cy.focused().should('have.attr', 'data-testid', 'record-button')
    })

    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="record-button"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'recording')
      
      cy.get('[data-testid="upload-area"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'upload')
    })
  })

  describe('Responsive Design', () => {
    it('should work on mobile viewport', () => {
      cy.viewport(375, 667) // iPhone SE
      
      cy.get('[data-testid="upload-area"]').should('be.visible')
      cy.get('[data-testid="record-button"]').should('be.visible')
      
      // Check that text is readable
      cy.get('h1').should('be.visible')
    })

    it('should work on tablet viewport', () => {
      cy.viewport(768, 1024) // iPad
      
      cy.get('[data-testid="upload-area"]').should('be.visible')
      cy.get('[data-testid="record-button"]').should('be.visible')
    })
  })
})
