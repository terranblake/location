describe('Device detail view', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/locations', {
      body: [
        {
          timestamp: '2025-07-01T10:00:00',
          device_id: 'terran_phone',
          lat: 37.7749,
          lon: -122.4194,
          accuracy: 10,
          friendly_name: 'Phone'
        },
        {
          timestamp: '2025-07-01T11:00:00',
          device_id: 'terran_phone',
          lat: 37.7799,
          lon: -122.4294,
          accuracy: 8,
          friendly_name: 'Phone'
        }
      ]
    }).as('locations');

    cy.visit('/');
    cy.wait('@locations');
  });

  it('zooms to device and shows history with working back button', () => {
    cy.window().then(win => {
      win.initialZoom = win.findHub.map.getZoom();
    });

    cy.get('.device-item').first().click();

    cy.window().then(win => {
      expect(win.findHub.map.getZoom()).to.be.greaterThan(win.initialZoom);
    });

    cy.get('#device-history-list .history-item').should('have.length.greaterThan', 0);

    cy.get('#device-back-btn').click();
    cy.get('#devices-view').should('be.visible');
  });
});
