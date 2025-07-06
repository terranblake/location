describe('Person focused view', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/locations', { fixture: 'locations.json' }).as('locs');
  });

  it('shows only selected person\'s devices', () => {
    cy.visit('/');
    cy.wait('@locs');

    // Open people tab
    cy.contains('button', 'People').click();

    // Click first person
    cy.get('.person-item').first().click();

    cy.get('#person-detail-view').should('be.visible');
    cy.get('#person-devices-list .device-item').should('have.length', 2);

    cy.window().its('findHub.currentPerson').should('exist');
  });
});
