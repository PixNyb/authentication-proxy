# Contributing

Contributions are welcome! In order to get started, please fork the repository and then clone it to your local machine. You can then create a new branch and make your changes. Once you are done, push your branch to your fork and open a pull request.

## Local Development

To get started with local development, the [Docker Compose](/docs/compose.md) example is a good place to start. This will allow you to run the authentication proxy locally and test your changes.

### Running Standalone

The authentication proxy can be run standalone as well. This is useful for debugging and testing. To get started, you will need to have [Node.js](https://nodejs.org/) installed.

1. Clone the repository
2. Install the dependencies
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the repository. You can use the `.env.example` file as a template.
4. Start the application
   ```bash
   npm start
   ```
5. Open your browser and go to `http://localhost:3000`
6. You should see the authentication proxy running.

## Provider Development

In order to add a new provider, simply create a new file in the `src/app/providers/` directory. This file should contain an implementation using a [Passport.js](http://www.passportjs.org/) strategy and be named using the following convention: `<provider>.provider.js`. New providers will automatically be discovered. Look at the existing providers for examples.

Implementations without a corresponding Passport.js strategy may be possible, but is not tested or supported.

Be sure to include unit tests for your provider. These tests should be placed in the `__test__/providers/` directory. Look at the existing tests for examples.

> [!NOTE]
> All provider configuration should be able to be set via environment variables. This allows the application to remain stateless and easily scalable. For some providers, a configuration file may be required. In this case, the volume should be mounted to the container and the path should be able to be set via an environment variable. (defaulting to `/etc/auth/<filename>`)