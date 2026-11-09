namespace SchoolAdmission.Api.Http;

public static class StudentIdHeader
{
    public const string Name = "X-Student-Id";

    public static string Require(HttpRequest request)
    {
        var value = request.Headers[Name].ToString().Trim();

        if (value.Length != 17 || !value.All(char.IsAsciiDigit))
        {
            throw Errors.ApiException.InvalidStudentId(
                "X-Student-Id must be the 17 digit birth registration number.");
        }

        return value;
    }
}
