import type { AlertButton } from "react-native";
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (!buttons?.length) {
      window.alert(title + "\n" + (message ?? ""));
      return;
    }
    const choices = buttons.filter(
      (b) => b.style !== "cancel" && b.text?.toLowerCase() !== "cancel",
    );
    if (choices.length === 1) {
      if (
        window.confirm(
          title + "\n" + (message ?? "") + "\n\n" + choices[0]!.text,
        )
      )
        choices[0]!.onPress?.();
      return;
    }
    const answer = window.prompt(
      title +
        "\n" +
        (message ?? "") +
        "\n" +
        choices.map((b, i) => `${i + 1}. ${b.text}`).join("\n") +
        "\nEnter choice number, or cancel.",
    );
    if (answer && /^\d+$/.test(answer))
      choices[Number(answer) - 1]?.onPress?.();
  },
};
