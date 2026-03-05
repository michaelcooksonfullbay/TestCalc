import { type Page, type Locator } from '@playwright/test';

export class LoginBarComponent {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginBtn: Locator;
  private readonly logoutBtn: Locator;
  private readonly guestIndicator: Locator;
  private readonly loginForm: Locator;
  private readonly loggedInInfo: Locator;
  private readonly currentUserLabel: Locator;
  private readonly loginError: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.locator('#username-input');
    this.passwordInput = page.locator('#password-input');
    this.loginBtn = page.locator('#login-btn');
    this.logoutBtn = page.locator('#logout-btn');
    this.guestIndicator = page.locator('#guest-indicator');
    this.loginForm = page.locator('#login-form');
    this.loggedInInfo = page.locator('#logged-in-info');
    this.currentUserLabel = page.locator('#current-user-label');
    this.loginError = page.locator('#login-error');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginBtn.click();
  }

  async logout() {
    await this.logoutBtn.click();
  }

  getGuestIndicator() {
    return this.guestIndicator;
  }

  getLoginForm() {
    return this.loginForm;
  }

  getLoggedInInfo() {
    return this.loggedInInfo;
  }

  async getLoggedInUser(): Promise<string> {
    return await this.currentUserLabel.innerText();
  }

  async getErrorText(): Promise<string> {
    return await this.loginError.innerText();
  }
}
