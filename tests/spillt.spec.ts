import { test, expect, Page } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Navigate to home and wait for splash screen to finish */
async function goHome(page: Page) {
  // baseURL is set in playwright.config.ts → 'http://localhost:5173'
  // page.goto('/') correctly resolves to 'http://localhost:5173/'
  await page.goto('http://localhost:5173/');
  // Splash screen appears for ~1.4s then fades
  await page.waitForSelector('.si-splash--out', { timeout: 3_000 }).catch(() => {});
  await page.waitForSelector('.si-home', { timeout: 8_000 });
}

async function fillName(page: Page, name: string) {
  await page.fill('input[placeholder="Ton pseudo..."]', name);
}

async function fillRoom(page: Page, room: string) {
  await page.fill('input[placeholder="Code du salon (ex: AB12C)"]', room);
}

/** Go to lobby as creator or solo */
async function goToLobby(page: Page, name = 'Alice', solo = false) {
  await goHome(page);
  await fillName(page, name);
  if (solo) {
    await page.click('button:has-text("🎮 Solo")');
  } else {
    await page.click('button:has-text("✨ Créer une partie")');
  }
  await page.waitForURL('**/lobby', { timeout: 8_000 });
}

/** Go directly to game (solo, 3 questions) */
async function goToGame(page: Page) {
  await goToLobby(page, 'Alice', true);
  await page.click('button:has-text("🚀 Démarrer")');
  await page.waitForURL('**/game', { timeout: 8_000 });
}

/** Play through N questions answering 'Oui' each time */
async function playQuestions(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    // Wait for an enabled Oui button
    await page.waitForSelector(
      '.si-question-card__btn--yes:not([disabled])',
      { timeout: 20_000 }
    );
    await page.click('.si-question-card__btn--yes');
    // Click next question or results button
    const nextBtn = page.locator(
      'button:has-text("Question suivante"), button:has-text("🏆 Résultats")'
    );
    await nextBtn.first().waitFor({ timeout: 8_000 });
    await nextBtn.first().click();
  }
}

/** Full run to results page (3 questions, solo) */
async function goToResults(page: Page) {
  await goHome(page);
  await fillName(page, 'Alice');
  await page.click('button:has-text("🎮 Solo")');
  await page.waitForURL('**/lobby', { timeout: 8_000 });
  // Set minimum 3 questions
  await page.locator('input[type="range"]').first().fill('3');
  await page.click('button:has-text("🚀 Démarrer")');
  await page.waitForURL('**/game', { timeout: 8_000 });
  await playQuestions(page, 3);
  await page.waitForURL('**/results', { timeout: 10_000 });
}

// ─── Suite: Page d'accueil ────────────────────────────────────────────────────

test.describe('🏠 Page d\'accueil', () => {

  test('affiche le titre et les éléments principaux', async ({ page }) => {
    await goHome(page);
    await expect(page.locator('.si-home__title')).toHaveText('Spill It!');
    await expect(page.locator('.si-home__emoji')).toBeVisible();
    await expect(page.locator('.si-home__subtitle')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/home-title.png', fullPage: true });
  });

  test('splash screen s\'affiche puis disparaît', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    const splash = page.locator('.si-splash');
    await expect(splash).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/splash-visible.png' });
    await expect(splash).toHaveClass(/si-splash--out/, { timeout: 3_000 });
    await page.waitForSelector('.si-home', { timeout: 8_000 });
    await page.screenshot({ path: 'test-results/screenshots/splash-gone.png' });
  });

  test('les boutons "Créer" et "Solo" sont désactivés sans pseudo', async ({ page }) => {
    await goHome(page);
    await expect(page.locator('button:has-text("✨ Créer une partie")')).toBeDisabled();
    await expect(page.locator('button:has-text("🎮 Solo")')).toBeDisabled();
    await page.screenshot({ path: 'test-results/screenshots/home-buttons-disabled.png', fullPage: true });
  });

  test('les boutons s\'activent quand le pseudo est rempli', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'TestUser');
    await expect(page.locator('button:has-text("✨ Créer une partie")')).toBeEnabled();
    await expect(page.locator('button:has-text("🎮 Solo")')).toBeEnabled();
    await page.screenshot({ path: 'test-results/screenshots/home-buttons-enabled.png', fullPage: true });
  });

  test('le bouton Rejoindre est désactivé sans pseudo ni code salon', async ({ page }) => {
    await goHome(page);
    await expect(page.locator('button:has-text("Rejoindre")')).toBeDisabled();
  });

  test('le bouton Rejoindre s\'active avec pseudo ET code salon', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'TestUser');
    await fillRoom(page, 'ABC12');
    await expect(page.locator('button:has-text("Rejoindre")')).toBeEnabled();
    await page.screenshot({ path: 'test-results/screenshots/home-join-enabled.png', fullPage: true });
  });

  test('le bouton spectateur apparaît quand pseudo + code sont remplis', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'TestUser');
    await fillRoom(page, 'ABC12');
    await expect(page.locator('.si-home__spectator-btn')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/home-spectator-btn.png', fullPage: true });
  });

  test('affiche l\'avatar après saisie du pseudo', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'TestUser');
    await expect(page.locator('.si-home__avatar-btn')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/home-avatar-btn.png', fullPage: true });
  });

  test('clique sur l\'avatar ouvre le picker d\'avatar', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'TestUser');
    await page.click('.si-home__avatar-btn');
    await expect(page.locator('.si-avatar-picker')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/home-avatar-picker.png', fullPage: true });
  });

  test('le texte d\'aide s\'affiche quand le pseudo est vide', async ({ page }) => {
    await goHome(page);
    await expect(page.locator('.si-home__hint')).toContainText('pseudo');
    await page.screenshot({ path: 'test-results/screenshots/home-hint.png', fullPage: true });
  });

  test('Réinitialiser vide les champs', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'TestUser');
    await fillRoom(page, 'ROOM1');
    await page.click('.si-home__reset');
    await expect(page.locator('input[placeholder="Ton pseudo..."]')).toHaveValue('');
    await expect(page.locator('input[placeholder="Code du salon (ex: AB12C)"]')).toHaveValue('');
    await page.screenshot({ path: 'test-results/screenshots/home-reset.png', fullPage: true });
  });

  test('le code salon est converti en majuscules', async ({ page }) => {
    await goHome(page);
    await fillRoom(page, 'abc12');
    await expect(page.locator('input[placeholder="Code du salon (ex: AB12C)"]')).toHaveValue('ABC12');
  });

  test('le paramètre ?room= pré-remplit le code salon', async ({ page }) => {
    await page.goto('http://localhost:5173/?room=PRFIL');
    await page.waitForSelector('.si-home', { timeout: 8_000 });
    await expect(
      page.locator('input[placeholder="Code du salon (ex: AB12C)"]')
    ).toHaveValue('PRFIL');
    expect(page.url()).not.toContain('room=');
    await page.screenshot({ path: 'test-results/screenshots/home-room-param.png', fullPage: true });
  });

  test('le lien d\'invitation peut être copié', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await goHome(page);
    await fillName(page, 'TestUser');
    await fillRoom(page, 'ABC12');
    await page.click('.si-home__invite-btn');
    await expect(page.locator('.si-home__invite-btn')).toHaveClass(/copied/);
    await page.screenshot({ path: 'test-results/screenshots/home-link-copied.png', fullPage: true });
  });

});

// ─── Suite: Navigation vers le Lobby ─────────────────────────────────────────

test.describe('🚪 Navigation vers le Lobby', () => {

  test('Créer une partie redirige vers /lobby', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'Alice');
    await page.click('button:has-text("✨ Créer une partie")');
    await page.waitForURL('**/lobby', { timeout: 8_000 });
    await page.screenshot({ path: 'test-results/screenshots/nav-create-lobby.png', fullPage: true });
  });

  test('Mode Solo redirige vers /lobby', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'Alice');
    await page.click('button:has-text("🎮 Solo")');
    await page.waitForURL('**/lobby', { timeout: 8_000 });
    await page.screenshot({ path: 'test-results/screenshots/nav-solo-lobby.png', fullPage: true });
  });

  test('Rejoindre redirige vers /lobby', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'Bob');
    await fillRoom(page, 'ROOM1');
    await page.click('button:has-text("Rejoindre")');
    await page.waitForURL('**/lobby', { timeout: 8_000 });
    await page.screenshot({ path: 'test-results/screenshots/nav-join-lobby.png', fullPage: true });
  });

  test('Enter dans le champ code salon déclenche Rejoindre', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'Bob');
    await fillRoom(page, 'ROOM1');
    await page.press('input[placeholder="Code du salon (ex: AB12C)"]', 'Enter');
    await page.waitForURL('**/lobby', { timeout: 8_000 });
  });

});

// ─── Suite: Lobby ─────────────────────────────────────────────────────────────

test.describe('🏠 Lobby', () => {

  test('affiche le titre Lobby', async ({ page }) => {
    await goToLobby(page);
    await expect(page.locator('h1')).toContainText('Lobby');
    await page.screenshot({ path: 'test-results/screenshots/lobby-title.png', fullPage: true });
  });

  test('affiche le mode Solo dans le titre', async ({ page }) => {
    await goToLobby(page, 'Alice', true);
    await expect(page.locator('h1')).toContainText('Solo');
    await page.screenshot({ path: 'test-results/screenshots/lobby-solo-title.png', fullPage: true });
  });

  test('le joueur créateur apparaît dans la liste', async ({ page }) => {
    await goToLobby(page, 'Alice');
    await expect(page.locator('.si-player-list')).toContainText('Alice');
    await page.screenshot({ path: 'test-results/screenshots/lobby-player-list.png', fullPage: true });
  });

  test('le badge Host est affiché', async ({ page }) => {
    await goToLobby(page);
    await expect(page.locator('.si-lobby__badge--host')).toBeVisible();
  });

  test('affiche le code du salon', async ({ page }) => {
    await goToLobby(page);
    const badge = page.locator('.si-lobby__badge--copy');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Code:');
  });

  test('le slider de questions fonctionne', async ({ page }) => {
    await goToLobby(page);
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('10');
    await expect(
      page.locator('label').filter({ hasText: 'questions' }).first()
    ).toContainText('10');
    await page.screenshot({ path: 'test-results/screenshots/lobby-slider.png', fullPage: true });
  });

  test('le toggle "Toutes catégories" fonctionne', async ({ page }) => {
    await goToLobby(page);
    const toggle = page.locator('.si-lobby__toggle');
    await expect(toggle).toContainText('OFF');
    await toggle.click();
    await expect(toggle).toContainText('ON');
    // Select dropdown should disappear
    await expect(page.locator('select')).not.toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/lobby-toggle-on.png', fullPage: true });
  });

  test('le bouton Ready change l\'état', async ({ page }) => {
    await goToLobby(page, 'Alice', true);
    const readyBtn = page.locator('.si-player-card__ready').first();
    await expect(readyBtn).toContainText('Ready?');
    await readyBtn.click();
    await expect(readyBtn).toContainText('✅ Ready');
    await page.screenshot({ path: 'test-results/screenshots/lobby-ready.png', fullPage: true });
  });

  test('le bouton Démarrer est désactivé si le joueur n\'est pas prêt', async ({ page }) => {
    await goToLobby(page);
    await expect(page.locator('button:has-text("🚀 Démarrer")')).toBeDisabled();
    await page.screenshot({ path: 'test-results/screenshots/lobby-start-disabled.png', fullPage: true });
  });

  test('le bouton Démarrer s\'active en mode solo (auto-ready)', async ({ page }) => {
    await goToLobby(page, 'Alice', true);
    await expect(page.locator('button:has-text("🚀 Démarrer")')).toBeEnabled();
    await page.screenshot({ path: 'test-results/screenshots/lobby-start-enabled.png', fullPage: true });
  });

  test('Démarrer en mode solo navigue vers /game', async ({ page }) => {
    await goToLobby(page, 'Alice', true);
    await page.click('button:has-text("🚀 Démarrer")');
    await page.waitForURL('**/game', { timeout: 8_000 });
    await page.screenshot({ path: 'test-results/screenshots/lobby-start-game.png', fullPage: true });
  });

  test('Retour depuis le lobby revient à l\'accueil', async ({ page }) => {
    await goToLobby(page);
    await page.click('button:has-text("← Retour")');
    await page.waitForURL('**/', { timeout: 5_000 });
    await page.screenshot({ path: 'test-results/screenshots/lobby-back.png', fullPage: true });
  });

  test('on peut ajouter un joueur local', async ({ page }) => {
    await goToLobby(page);
    await page.fill('input[placeholder="Ajouter un joueur local..."]', 'Bob');
    await page.press('input[placeholder="Ajouter un joueur local..."]', 'Enter');
    await expect(page.locator('.si-player-list')).toContainText('Bob');
    await page.screenshot({ path: 'test-results/screenshots/lobby-add-player.png', fullPage: true });
  });

  test('le lien d\'invitation est copiable', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await goToLobby(page);
    await page.click('.si-lobby__invite-link');
    await expect(page.locator('.si-lobby__invite-link')).toContainText('Lien copié');
    await page.screenshot({ path: 'test-results/screenshots/lobby-invite-copied.png', fullPage: true });
  });

  test('le slider de timer fonctionne', async ({ page }) => {
    await goToLobby(page);
    const timerSlider = page.locator('input[type="range"]').nth(1);
    await timerSlider.fill('30');
    await expect(
      page.locator('label').filter({ hasText: 'Temps' })
    ).toContainText('30s');
    await page.screenshot({ path: 'test-results/screenshots/lobby-timer-slider.png', fullPage: true });
  });

});

// ─── Suite: Page de jeu ───────────────────────────────────────────────────────

test.describe('🎮 Page de jeu', () => {

  test('affiche l\'arène de jeu', async ({ page }) => {
    await goToGame(page);
    await expect(page.locator('.si-game-arena')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/game-arena.png', fullPage: true });
  });

  test('affiche le timer et la progression', async ({ page }) => {
    await goToGame(page);
    await expect(page.locator('.si-game-arena__progress')).toBeVisible();
    await expect(page.locator('.si-timer')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/game-timer.png', fullPage: true });
  });

  test('affiche la question', async ({ page }) => {
    await goToGame(page);
    await expect(page.locator('.si-question-card__text')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/game-question.png', fullPage: true });
  });

  test('affiche les boutons Oui et Non', async ({ page }) => {
    await goToGame(page);
    await expect(page.locator('.si-question-card__btn--yes')).toBeVisible();
    await expect(page.locator('.si-question-card__btn--no')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/game-buttons.png', fullPage: true });
  });

  test('affiche le joueur dans un coin', async ({ page }) => {
    await goToGame(page);
    await expect(page.locator('.si-game-arena__player')).toBeVisible();
    await expect(page.locator('.si-game-arena__player-name')).toContainText('Alice');
  });

  test('répondre Oui affiche le résultat immédiatement (solo)', async ({ page }) => {
    await goToGame(page);
    await page.click('.si-question-card__btn--yes');
    await expect(page.locator('.si-question-card__result')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/screenshots/game-answer-yes.png', fullPage: true });
  });

  test('répondre Non affiche le résultat immédiatement (solo)', async ({ page }) => {
    await goToGame(page);
    await page.click('.si-question-card__btn--no');
    await expect(page.locator('.si-question-card__result')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/screenshots/game-answer-no.png', fullPage: true });
  });

  test('le bouton "Question suivante" apparaît après réponse', async ({ page }) => {
    await goToGame(page);
    await page.click('.si-question-card__btn--yes');
    await expect(
      page.locator('.si-game-arena__next-btn')
    ).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/screenshots/game-next-btn.png', fullPage: true });
  });

  test('les boutons sont désactivés après réponse (pas de double vote)', async ({ page }) => {
    await goToGame(page);
    await page.click('.si-question-card__btn--yes');
    await expect(page.locator('.si-question-card__btn--yes')).toBeDisabled({ timeout: 3_000 });
    await expect(page.locator('.si-question-card__btn--no')).toBeDisabled({ timeout: 3_000 });
    await page.screenshot({ path: 'test-results/screenshots/game-buttons-disabled.png', fullPage: true });
  });

  test('la progression avance entre les questions (Q1 → Q2)', async ({ page }) => {
    await goToGame(page);
    const progress = page.locator('.si-game-arena__progress');
    await expect(progress).toContainText('Q1');
    await page.click('.si-question-card__btn--yes');
    await page.locator('.si-game-arena__next-btn').click();
    await expect(progress).toContainText('Q2');
    await page.screenshot({ path: 'test-results/screenshots/game-progress-q2.png', fullPage: true });
  });

  test('le timer passe en mode danger (≤3s)', async ({ page }) => {
    await goToGame(page);
    await expect(
      page.locator('.si-timer--danger')
    ).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: 'test-results/screenshots/game-timer-danger.png', fullPage: true });
  });

  test('la dernière question redirige vers /results', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'Alice');
    await page.click('button:has-text("🎮 Solo")');
    await page.waitForURL('**/lobby', { timeout: 8_000 });
    await page.locator('input[type="range"]').first().fill('3');
    await page.click('button:has-text("🚀 Démarrer")');
    await page.waitForURL('**/game', { timeout: 8_000 });
    await playQuestions(page, 3);
    await page.waitForURL('**/results', { timeout: 10_000 });
    await page.screenshot({ path: 'test-results/screenshots/game-to-results.png', fullPage: true });
  });

});

// ─── Suite: Page de résultats ─────────────────────────────────────────────────

test.describe('🏆 Page de résultats', () => {

  test('affiche le banner de fin de partie', async ({ page }) => {
    await goToResults(page);
    await expect(page.locator('.si-results-v2__banner')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/results-banner.png', fullPage: true });
  });

  test('affiche le joueur dans le podium', async ({ page }) => {
    await goToResults(page);
    await expect(
      page.locator('.si-results-v2__player-name').first()
    ).toContainText('Alice');
    await page.screenshot({ path: 'test-results/screenshots/results-podium.png', fullPage: true });
  });

  test('affiche les boutons d\'action', async ({ page }) => {
    await goToResults(page);
    await expect(page.locator('button:has-text("🔄 Rejouer")')).toBeVisible();
    await expect(page.locator('button:has-text("📤 Partager")')).toBeVisible();
    await expect(page.locator('button:has-text("📥 Exporter")')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/results-actions.png', fullPage: true });
  });

  test('le bouton Rejouer ramène à l\'accueil', async ({ page }) => {
    await goToResults(page);
    await page.click('button:has-text("🔄 Rejouer")');
    await page.waitForURL('**/', { timeout: 5_000 });
    await page.screenshot({ path: 'test-results/screenshots/results-replay.png', fullPage: true });
  });

  test('affiche le code de salle', async ({ page }) => {
    await goToResults(page);
    await expect(page.locator('.si-results-v2__room')).toContainText('Room :');
  });

  test('l\'historique des rounds peut être ouvert', async ({ page }) => {
    await goToResults(page);
    await page.click('.si-results-v2__history-toggle');
    await expect(page.locator('.si-results-v2__history')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/results-history.png', fullPage: true });
  });

  test('l\'historique affiche 3 rounds', async ({ page }) => {
    await goToResults(page);
    await page.click('.si-results-v2__history-toggle');
    const rounds = page.locator('.si-results-v2__round');
    await expect(rounds).toHaveCount(3);
    await page.screenshot({ path: 'test-results/screenshots/results-history-rounds.png', fullPage: true });
  });

  test('le bouton Copier copie le code de la salle', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await goToResults(page);
    await page.click('.si-results-v2__copy');
    await expect(page.locator('.si-results-v2__copy')).toContainText('✅');
    await page.screenshot({ path: 'test-results/screenshots/results-copy.png', fullPage: true });
  });

  test('le bouton Exporter change d\'état', async ({ page }) => {
    await goToResults(page);
    await page.click('button:has-text("📥 Exporter")');
    await expect(page.locator('button:has-text("✅ Exporté !")')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/screenshots/results-export.png', fullPage: true });
  });

});

// ─── Suite: Redirections ──────────────────────────────────────────────────────

test.describe('🔀 Redirections', () => {

  test('URL inconnue redirige vers /', async ({ page }) => {
    await page.goto('http://localhost:5173/unknown-page');
    await page.waitForURL('**/', { timeout: 8_000 });
    await page.screenshot({ path: 'test-results/screenshots/redirect-unknown.png' });
  });

  test('/lobby sans session redirige vers /', async ({ page }) => {
    await page.goto('http://localhost:5173/lobby');
    await page.waitForURL('**/', { timeout: 8_000 });
    await page.screenshot({ path: 'test-results/screenshots/redirect-lobby.png' });
  });

});

// ─── Suite: UX / Accessibilité ────────────────────────────────────────────────

test.describe('♿ UX & Accessibilité', () => {

  test('titre de la page est "SPILLT"', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveTitle('SPILLT');
  });

  test('le favicon est un SVG', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await expect(
      page.locator('link[rel="icon"]')
    ).toHaveAttribute('type', 'image/svg+xml');
  });

  test('le champ pseudo est auto-focusé au chargement', async ({ page }) => {
    await goHome(page);
    await expect(
      page.locator('input[placeholder="Ton pseudo..."]')
    ).toBeFocused();
  });

  test('le picker d\'avatar a les boutons Générer et Sauvegarder', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'Alice');
    await page.click('.si-home__avatar-btn');
    await expect(page.locator('.si-avatar-picker__reroll')).toBeVisible();
    await expect(page.locator('.si-avatar-picker__save')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/ux-avatar-picker.png', fullPage: true });
  });

  test('fermer le picker d\'avatar le cache', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'Alice');
    await page.click('.si-home__avatar-btn');
    await expect(page.locator('.si-avatar-picker')).toBeVisible();
    await page.click('.si-home__avatar-btn'); // toggle off
    await expect(page.locator('.si-avatar-picker')).not.toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/ux-avatar-closed.png', fullPage: true });
  });

  test('le champ code salon accepte max 8 caractères', async ({ page }) => {
    await goHome(page);
    await fillRoom(page, 'ABCDEFGHIJ'); // 10 chars
    const val = await page.locator('input[placeholder="Code du salon (ex: AB12C)"]').inputValue();
    expect(val.length).toBeLessThanOrEqual(8);
  });

  test('le pseudo est limité à 16 caractères', async ({ page }) => {
    await goHome(page);
    await fillName(page, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'); // 26 chars
    const val = await page.locator('input[placeholder="Ton pseudo..."]').inputValue();
    expect(val.length).toBeLessThanOrEqual(16);
  });

});