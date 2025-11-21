// On failure, returns a (possibly empty) string array of errors. Otherwise null
export type FieldValidator = (value: string) => string[] | null;

export const usernameValidator: FieldValidator = (username) => {
  const errors = [];

  if (username.length === 0) {
    errors.push("Username cannot be empty");
  } else if (username.length < 3) {
    errors.push("Username too short");
  }
  if (username.length > 32) {
    errors.push("Username too long");
  }

  if (!username.match(/^[a-zA-Z0-9_]*$/)) {
    errors.push("Invalid characters");
  } else if (!username.match(/[a-zA-Z]/)) {
    errors.push("Must contain letters");
  }

  if (errors.length) {
    return errors;
  }

  return null;
};

export const passwordValidator: FieldValidator = (password) => {
  const errors: string[] = [];

  if (password === "password") {
    errors.push("This password already exists in our database");
    errors.push("Just kidding");
    errors.push("But maybe try something more original?");
  }

  enum PasswordErrors {
    TOO_SHORT = "Password too short",
    TOO_LONG = "Password too long",
    MISSING_UPPERCASE = "Need at least one uppercase character",
    MISSING_LOWERCASE = "Need at least one lowercase character",
    MISSING_NUMBER = "Need at least one number",
    MISSING_SPECIAL = "Need at least one special character",
  }

  const HAS_UPPERCASE = /[A-Z]/;
  const HAS_LOWERCASE = /[a-z]/;
  const HAS_NUMBER = /[0-9]/;
  const HAS_SPECIAL = /[!@#$%^&*(),.?":{}|<>-_]/;
  const PASSWORD_MIN_LEN = 8;
  const PASSWORD_MAX_LEN = 64;

  if (!password || password.length < PASSWORD_MIN_LEN)
    errors.push(PasswordErrors.TOO_SHORT);
  if (password.length > PASSWORD_MAX_LEN) errors.push(PasswordErrors.TOO_LONG);
  if (!HAS_UPPERCASE.test(password))
    errors.push(PasswordErrors.MISSING_UPPERCASE);
  if (!HAS_LOWERCASE.test(password))
    errors.push(PasswordErrors.MISSING_LOWERCASE);
  if (!HAS_NUMBER.test(password)) errors.push(PasswordErrors.MISSING_NUMBER);
  if (!HAS_SPECIAL.test(password)) errors.push(PasswordErrors.MISSING_SPECIAL);

  if (errors.length) {
    return errors;
  }
  return null;
};

export const emailValidator: FieldValidator = (email) => {
  if (!email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
    return ["Invalid email"];
  }
  return null;
};
