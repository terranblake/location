describe('People tab default', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/locations', { fixture: 'locations.json' })
    cy.visit('/html/index.html')
  })

  it('shows overview of all people', () => {
    cy.contains('button', 'People').click()
    cy.get('#people-view').should('be.visible')
    cy.get('#people-tab').should('have.class', 'active')
    cy.get('#people-list .person-item', { timeout: 10000 }).should('have.length', 2)
    cy.get('.leaflet-marker-pane', { timeout: 10000 }).find('img.leaflet-marker-icon').should('have.length', 2)
  })
})
